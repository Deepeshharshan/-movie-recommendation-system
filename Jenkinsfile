// =============================================================================
// VISIONCINE — Jenkinsfile
// Production CI/CD Pipeline: 8 stages
// =============================================================================

pipeline {

    agent any

    environment {
        // Docker image settings
        IMAGE_NAME    = "visioncine"
        IMAGE_TAG     = "${BUILD_NUMBER}"
        DOCKERHUB_USER = "deepeshharshan"
        FULL_IMAGE    = "${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}"

        // SonarQube — configured in Jenkins global settings
        SONAR_PROJECT_KEY = "visioncine"

        // Paths
        BACKEND_DIR = "backend"

        // Trivy output
        TRIVY_REPORT = "trivy-report.txt"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 45, unit: 'MINUTES')
        timestamps()
        disableConcurrentBuilds()
    }

    stages {

        // ─── Stage 1: Checkout Source ──────────────────────────────────────
        stage('Checkout Source') {
            steps {
                checkout scm
                echo "✅ Checked out: ${env.GIT_BRANCH} @ ${env.GIT_COMMIT?.take(7)}"
                sh 'git log --oneline -3'
            }
        }

        // ─── Stage 2: Install Dependencies ────────────────────────────────
        stage('Install Dependencies') {
            steps {
                dir(BACKEND_DIR) {
                    sh '''
                        python3 -m venv .venv-ci
                        . .venv-ci/bin/activate
                        pip install --quiet --upgrade pip
                        pip install --quiet -r requirements.txt
                        pip install --quiet pytest pytest-cov flask-testing
                        echo "✅ Dependencies installed"
                        pip list | grep -E "Flask|gunicorn|SQLAlchemy|pytest"
                    '''
                }
            }
        }

        // ─── Stage 3: Run Backend Tests ───────────────────────────────────
        stage('Run Backend Tests') {
            steps {
                dir(BACKEND_DIR) {
                    sh '''
                        . .venv-ci/bin/activate
                        export FLASK_ENV=testing
                        export SECRET_KEY=ci-test-secret-key
                        export DATABASE_URL=sqlite:///:memory:
                        export TMDB_API_KEY=dummy-for-testing

                        python3 -m pytest tests/ \
                            --tb=short \
                            --cov=app \
                            --cov-report=xml:coverage.xml \
                            --cov-report=term-missing \
                            -v
                        echo "✅ All tests passed"
                    '''
                }
            }
            post {
                always {
                    junit(testResults: "${BACKEND_DIR}/test-results/*.xml", allowEmptyResults: true)
                }
            }
        }

        // ─── Stage 4: Verify APIs ──────────────────────────────────────────
        stage('Verify APIs') {
            steps {
                dir(BACKEND_DIR) {
                    sh '''
                        . .venv-ci/bin/activate
                        export FLASK_ENV=testing
                        export SECRET_KEY=ci-test-secret-key
                        export DATABASE_URL=sqlite:///ci_verify.db
                        export TMDB_API_KEY=dummy-for-testing

                        python3 -c "
from app import create_app
app = create_app('testing')
client = app.test_client()

# Verify core routes exist
r = client.get('/')
assert r.status_code in [200, 301, 302], f'Home route failed: {r.status_code}'

r = client.post('/auth/register',
    json={'first_name':'CI','last_name':'Test','email':'ci@test.local','password':'Pass1234!'},
    content_type='application/json')
assert r.status_code in [200, 201, 400, 409], f'Register route failed: {r.status_code}'

r = client.post('/auth/login',
    json={'email':'ci@test.local','password':'Pass1234!'},
    content_type='application/json')
assert r.status_code in [200, 201, 400, 401], f'Login route failed: {r.status_code}'

print('✅ API routes verified: /, /auth/register, /auth/login')
"
                        rm -f ci_verify.db
                    '''
                }
            }
        }

        // ─── Stage 5: Build Docker Image ──────────────────────────────────
        stage('Build Docker Image') {
            steps {
                dir(BACKEND_DIR) {
                    sh """
                        echo "Building ${FULL_IMAGE}..."
                        DOCKER_CONTEXT=desktop-linux docker build -t ${FULL_IMAGE} -t ${DOCKERHUB_USER}/${IMAGE_NAME}:latest . 2>&1
                        echo "✅ Docker image built: ${FULL_IMAGE}"
                        DOCKER_CONTEXT=desktop-linux docker images ${DOCKERHUB_USER}/${IMAGE_NAME} --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}"
                    """
                }
            }
        }

        // ─── Stage 6: SonarQube Analysis ──────────────────────────────────
        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                              -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                              -Dsonar.projectName="VisionCine Movie Recommendation System" \
                              -Dsonar.projectVersion=${BUILD_NUMBER} \
                              -Dsonar.sources=${BACKEND_DIR}/app \
                              -Dsonar.language=py \
                              -Dsonar.python.coverage.reportPaths=${BACKEND_DIR}/coverage.xml \
                              -Dsonar.exclusions=**/__pycache__/**,**/*.pyc,**/venv/**,**/.venv*/**,**/migrations/**,**/tests/**
                            echo "✅ SonarQube analysis submitted"
                        """
                    }
                }
            }
        }

        // ─── Stage 6b: Quality Gate ────────────────────────────────────────
        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
                echo "✅ SonarQube Quality Gate passed"
            }
        }

        // ─── Stage 7: Trivy Docker Image Scan ─────────────────────────────
        stage('Trivy Security Scan') {
            steps {
                sh """
                    echo "=== Trivy Image Scan: ${FULL_IMAGE} ==="

                    trivy image \
                        --exit-code 0 \
                        --severity LOW,MEDIUM \
                        --no-progress \
                        --format table \
                        ${FULL_IMAGE} | head -40 || true

                    echo "\\n=== HIGH/CRITICAL Vulnerabilities ==="
                    trivy image \
                        --exit-code 1 \
                        --severity HIGH,CRITICAL \
                        --no-progress \
                        --format table \
                        --output ${TRIVY_REPORT} \
                        ${FULL_IMAGE}

                    echo "✅ Trivy scan complete — no HIGH/CRITICAL vulnerabilities"
                """
            }
            post {
                always {
                    archiveArtifacts(
                        artifacts: "${TRIVY_REPORT}",
                        allowEmptyArchive: true
                    )
                }
                failure {
                    echo "❌ HIGH/CRITICAL vulnerabilities found! See ${TRIVY_REPORT}"
                }
            }
        }

        // ─── Stage 8: Publish Build Result ────────────────────────────────
        stage('Publish Build Result') {
            steps {
                sh """
                    echo "================================================"
                    echo "  VISIONCINE CI/CD — BUILD SUMMARY"
                    echo "================================================"
                    echo "  Job:        ${JOB_NAME}"
                    echo "  Build:      #${BUILD_NUMBER}"
                    echo "  Branch:     ${GIT_BRANCH}"
                    echo "  Commit:     ${GIT_COMMIT?.take(7)}"
                    echo "  Image:      ${FULL_IMAGE}"
                    echo "  Status:     SUCCESS ✅"
                    echo "  Timestamp:  \$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
                    echo "================================================"
                """
                archiveArtifacts(
                    artifacts: "${BACKEND_DIR}/coverage.xml",
                    allowEmptyArchive: true
                )
            }
        }
    }

    // ─── Post-pipeline Notifications ──────────────────────────────────────
    post {
        success {
            echo "🎉 Pipeline SUCCEEDED — Branch: ${env.GIT_BRANCH} | Build: #${env.BUILD_NUMBER}"
        }
        failure {
            echo "💥 Pipeline FAILED — Branch: ${env.GIT_BRANCH} | Build: #${env.BUILD_NUMBER} | Stage: ${env.STAGE_NAME}"
        }
        always {
            cleanWs(cleanWhenSuccess: true, cleanWhenFailure: false)
        }
    }
}

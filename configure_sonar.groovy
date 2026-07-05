import jenkins.model.*
import hudson.plugins.sonar.*
import hudson.plugins.sonar.model.TriggersConfig
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.domains.Domain
import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl
import org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl
import hudson.util.Secret

def instance = Jenkins.getInstance()
def desc = instance.getDescriptor(SonarGlobalConfiguration.class)

def sonarInst = new SonarInstallation(
    "SonarQube",
    "http://sonarqube:9000",
    "sonar-token",
    null,
    null,
    null,
    null,
    null,
    new TriggersConfig()
)

desc.setInstallations(sonarInst)
desc.save()

// Add credentials
def domain = Domain.global()
def store = instance.getExtensionList('com.cloudbees.plugins.credentials.SystemCredentialsProvider')[0].getStore()
def secretText = new StringCredentialsImpl(
  com.cloudbees.plugins.credentials.CredentialsScope.GLOBAL,
  "sonar-token",
  "SonarQube Token",
  Secret.fromString("squ_73bf143ac8a9b2e3989c85531969e1c6a2a7c118")
)
store.addCredentials(domain, secretText)

// Configure SonarScanner global tool
import hudson.plugins.sonar.SonarRunnerInstallation
import hudson.plugins.sonar.SonarRunnerInstaller
import hudson.tools.InstallSourceProperty

def sonarRunnerDesc = instance.getDescriptor(SonarRunnerInstallation.class)
def installer = new SonarRunnerInstaller("5.0.1.3006")
def installSourceProperty = new InstallSourceProperty([installer])
def sonarRunnerInst = new SonarRunnerInstallation("SonarScanner", "", [installSourceProperty])

sonarRunnerDesc.setInstallations(sonarRunnerInst)
sonarRunnerDesc.save()

println "SonarQube configured successfully."

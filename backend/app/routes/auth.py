import re
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user

from app.extensions import db
from app.models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_registration(username, email, password):
    errors = []
    if not username or len(username) < 3:
        errors.append("Username must be at least 3 characters.")
    if not email or not EMAIL_RE.match(email):
        errors.append("Please provide a valid email address.")
    if not password or len(password) < 6:
        errors.append("Password must be at least 6 characters.")
    return errors


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        if request.is_json:
            return jsonify({"message": "Already authenticated"}), 200
        return redirect(url_for("movies.home"))

    if request.method == "POST":
        # Support JSON for the Spatial UI API
        if request.is_json:
            username = (request.json.get("first_name", "") + " " + request.json.get("last_name", "")).strip()
            email = request.json.get("email", "").strip().lower()
            password = request.json.get("password", "")
        else:
            username = request.form.get("username", "").strip()
            email = request.form.get("email", "").strip().lower()
            password = request.form.get("password", "")

        errors = _validate_registration(username, email, password)

        if not errors:
            if User.query.filter_by(username=username).first():
                errors.append("That username is already taken.")
            if User.query.filter_by(email=email).first():
                errors.append("An account with that email already exists.")

        if errors:
            if request.is_json:
                return jsonify({"error": errors[0]}), 400
            for e in errors:
                flash(e, "error")
            return render_template("auth/register.html", username=username, email=email)

        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        login_user(user)
        
        if request.is_json:
            return jsonify({"message": "Registration successful", "token": "session_based"}), 201

        flash(f"Welcome, {user.username}! Your account has been created.", "success")
        return redirect(url_for("movies.home"))

    return render_template("auth/register.html")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        if request.is_json:
            return jsonify({"message": "Already authenticated"}), 200
        return redirect(url_for("movies.home"))

    if request.method == "POST":
        if request.is_json:
            identifier = request.json.get("email", "").strip()
            password = request.json.get("password", "")
            remember = True
        else:
            identifier = request.form.get("username", "").strip()
            password = request.form.get("password", "")
            remember = bool(request.form.get("remember"))

        user = User.query.filter(
            (User.username == identifier) | (User.email == identifier.lower())
        ).first()

        if user and user.check_password(password):
            login_user(user, remember=remember)
            if request.is_json:
                return jsonify({"message": "Login successful", "token": "session_based"}), 200
            
            flash(f"Welcome back, {user.username}!", "success")
            next_page = request.args.get("next")
            return redirect(next_page or url_for("movies.home"))

        if request.is_json:
            return jsonify({"error": "Invalid credentials."}), 401
            
        flash("Invalid username/email or password.", "error")
        return render_template("auth/login.html", username=identifier)

    return render_template("auth/login.html")


@auth_bp.route("/logout", methods=["GET", "POST"])
@login_required
def logout():
    logout_user()
    if request.is_json or request.method == "POST":
        return jsonify({"message": "Logged out successfully"}), 200
        
    flash("You have been logged out.", "info")
    return redirect(url_for("auth.login"))


@auth_bp.route("/api/check-username")
def check_username():
    username = request.args.get("username", "").strip()
    exists = User.query.filter_by(username=username).first() is not None
    return jsonify({"available": not exists})

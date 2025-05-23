from flask import Flask, render_template, request, redirect, url_for
app = Flask(__name__)
@app.route('/')
def index():
    return render_template('index.html')
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':   
        return redirect(url_for('index'))
    return render_template('register.html')
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':      
        return redirect(url_for('index'))
    return render_template('login.html')
@app.route('/post', methods=['GET', 'POST'])
def post():
    if request.method == 'POST':       
        return redirect(url_for('index'))
    return render_template('post.html')

from flask import Flask
from flask_socketio import SocketIO
from flask_pymongo import PyMongo
#from redis import Redis


app = Flask(__name__)
app.config['SECRET_KEY'] = "secret"
app.config["MONGO_URI"] = "mongodb://localhost:27017/pixnguess-test"
# app.config['MONGO_DBNAME'] = "pixnguess-test"
# app.config['MONGO_HOST'] = "localhost"
# app.config['MONGO_PORT'] = "27017"

mongo = PyMongo(app)
#redis = Redis()
socketio = SocketIO(app, cors_allowed_origins="*")

from .routes import *
from src import app, socketio, mongo
from flask import render_template
from flask_socketio import join_room, emit, send
from datetime import datetime, timedelta
from fuzzywuzzy import fuzz
from uuid import uuid4

ROOMS = {}
DATE_FORMAT = "%Y/%m/%d %H:%M:%S"
THRESHOLD = timedelta(seconds=60)
HINT_THRESHOLD = timedelta(seconds=2)

@app.route("/")
def index():
    return render_template('index.html')

@socketio.on('create')
def on_create(data):
    user_id = data.get('user_id')
    if not user_id:
        # emit("join_room", {'error': 'no user id provided', 'status':'error'})
        user_id = str(uuid4())
    riddle = next(mongo.db.riddles.aggregate([{ "$sample": { "size": 1 } }]))
    image_path = riddle['images'][0]
    game = {
        'user_id': user_id,
        'score': 0,
        'answers': [],
        'correct_answers': [],
        'path': image_path,
        'started_on': datetime.now().strftime(DATE_FORMAT),
        'last_time_answered': datetime.now().strftime(DATE_FORMAT),
        'hint': [None if letter != ' ' else ' ' for letter in riddle['answer']],
        'hint_sent': False
    }
    room = game['user_id']
    ROOMS[room] = game
    join_room(room)
    emit("join_room", {'game': game, 'status': 'ok'})

@socketio.on('solve')
def on_solve(data):
    user_id = data.get('user_id')
    answer = data.get('answer')
    if not user_id:
        emit("update", {'error': 'no user id provided', 'status': 'error'})
    if not answer:
        emit("update", {'error': 'no answer provided', 'status': 'error'})

    game = ROOMS.get(user_id)
    if not game:
        emit("update", {'error': 'user doesnt have a game started', 'status': 'error'})
    if datetime.now() - datetime.strptime(game['started_on'], DATE_FORMAT) > THRESHOLD:
        emit("update", {'error': 'game finished', 'status': 'finished'})
    
    searched_riddle = next(mongo.db.riddles.find({"images": {"$in": [game['path']]}}))
    searched_answer = searched_riddle['answer']
    viable_answers = [searched_answer, searched_answer.split(" ")[-1]]
    is_correct_answer = max([fuzz.WRatio(answer, expected_answer) for expected_answer in viable_answers]) > 90

    game['correct_answers'].append(searched_answer)
    game['answers'].append({'answer': answer, 'is_correct': is_correct_answer})
    if is_correct_answer:
        game['score'] = game['score'] + 1
    next_riddle = next(mongo.db.riddles.aggregate([{ "$sample": { "size": 1 } }]))
    next_image_path = next_riddle['images'][0]
    game['path'] = next_image_path
    game['last_time_answered'] = datetime.now().strftime(DATE_FORMAT)
    game['hint'] = [None if letter != ' ' else ' ' for letter in next_riddle['answer']]
    game['hint_sent'] = False
    ROOMS[user_id] = game
    emit("update", {'game': game, 'status': 'ok'})

@socketio.on('check')
def on_check(data):
    user_id = data.get('user_id')
    if not user_id:
        emit("update", {'error': 'no user id provided', 'status': 'error'})
    game = ROOMS.get(user_id)
    if not game:
        emit("update", {'error': 'user doesnt have a game started', 'status': 'error'})
    if datetime.now() - datetime.strptime(game['started_on'], DATE_FORMAT) > THRESHOLD:
        emit("update", {'error': 'game finished', 'status': 'finished'})
    if not game['hint_sent'] and datetime.now() - datetime.strptime(game['last_time_answered'], DATE_FORMAT) > HINT_THRESHOLD:
        searched_riddle = next(mongo.db.riddles.find({"images": {"$in": [game['path']]}}))
        searched_answer = searched_riddle['answer']
        splitted_answer = searched_answer.split(" ")
        if len(splitted_answer) > 1:
            hint_firstname = list(' '.join(splitted_answer[:-1]))
            hint_lastname = [None for _ in splitted_answer[-1]]
            hint = hint_firstname + [' '] + hint_lastname
            game['hint'] = hint
            game['hint_sent'] = True
        ROOMS[user_id] = game
    emit("update", {'game': game, 'status': 'ok'})
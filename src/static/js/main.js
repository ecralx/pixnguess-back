var BACKEND_URL = "http://192.168.1.10:5000"
var IMAGES_URL = "http://192.168.1.10:8000/"
var socket = io.connect(BACKEND_URL);
var gameLaunched = false;
var gameFinished = false;
var user_id;
var game = {}
var interval;


var FULL_DASH_ARRAY = 283;
var TIME_LIMIT = 60;
var WARNING_THRESHOLD = 30;
var ALERT_THRESHOLD = 15;
var COLOR_CODES = {
    info: {
        color: "green"
    },
    warning: {
        color: "orange",
        threshold: WARNING_THRESHOLD
    },
    alert: {
        color: "red",
        threshold: ALERT_THRESHOLD
    }
};
var remainingPathColor = COLOR_CODES.info.color;
document.getElementById('base-timer-path-remaining').classList.add(remainingPathColor)

// verify our websocket connection is established
socket.on('connect', function() {
    console.log('Websocket connected!');
});
// message handler for the 'join_room' channel
socket.on('join_room', function(resp) {
    console.log('join room', resp);
    if (resp.status == 'ok') {
        gameLaunched = true;
        game = resp.game
        user_id = game.user_id
        document.getElementById('pt1').style.display='none';
        document.getElementById('pt2-score').textContent=game.score
        document.getElementById('pt2-img').src=IMAGES_URL + game.path
        document.getElementById('pt2-time').textContent=Math.max(0, (60 - Math.floor(((new Date()) - (new Date(game.started_on))) / 1000))).toString()
        document.getElementById('pt2-hint').innerHTML = ''
        game.hint.forEach(function(letter) {
            var node = document.createElement('td')
            var textnode = document.createTextNode(letter ? letter : '_')
            node.appendChild(textnode)
            document.getElementById('pt2-hint').appendChild(node)
        })
        document.getElementById('pt2').style.display='block';
        document.getElementById('pt2-input').focus();
        interval = window.setInterval(check, 1000, user_id)
    }
});
socket.on('update', function(resp) {
    console.log('update', resp);
    if (resp.status == 'ok') {
        game = resp.game;
        document.getElementById('pt2-score').textContent=game.score;
        document.getElementById('pt2-img').src= IMAGES_URL + game.path;
        var timeLeft = Math.max(0, (60 - Math.floor(((new Date()) - (new Date(game.started_on))) / 1000)));
        document.getElementById('pt2-time').textContent= timeLeft.toString();
        setCircleDasharray(timeLeft);
        setRemainingPathColor(timeLeft);
        console.log(game.hint)
        document.getElementById('pt2-hint').innerHTML = ''
        game.hint.forEach(function(letter) {
            var node = document.createElement('td')
            var textnode = document.createTextNode(letter ? letter : '_')
            node.appendChild(textnode)
            document.getElementById('pt2-hint').appendChild(node)
        })
        if (game.answers.length > 0) {
            var is_correct = game.answers[game.answers.length - 1].is_correct === true;
            setBordersOnAnswer(is_correct)
        }
    }
    if (resp.status == 'finished') {
        gameFinished = true;
        window.clearInterval(interval);
        document.getElementById('pt2').style.display='none';
        document.getElementById('pt3').style.display='block';
        document.getElementById('pt3-score').textContent='You have scored: ' + game.score + ' points'
        document.getElementById('pt3-ul').innerHTML = ''
        game.correct_answers.forEach(function(answer, index) {
            var user_answer = game.answers[index].answer;
            var is_user_answer_correct = game.answers[index].is_correct;
            var node = document.createElement('li');
            var textnode = document.createTextNode(user_answer + " (" + answer +")");
            node.appendChild(textnode);
            node.className = is_user_answer_correct ? 'correct' : 'incorrect';
            document.getElementById('pt3-ul').appendChild(node)
        })
    }
})
// createGame onclick - emit a message on the 'create' channel to 
// create a new game with default parameters
function createGame() {
    console.log('Creating game...');
    socket.emit('create', {user_id: user_id});
}
function solve() {
    console.log('Sending an answer...');
    var answer = document.getElementById('pt2-input').value;
    socket.emit('solve', {user_id: user_id, answer: answer});
    document.getElementById('pt2-input').value = '';
    document.getElementById('pt2-input').focus();
}
function check(id) {
    socket.emit('check', {user_id: id});
}
function onKeyPress(e) {
    if (e.keyCode == 13) {
        solve()
    }
}
function replay() {
    window.location.reload()
}
function calculateTimeFraction(timeLeft) {
    var rawTimeFraction = timeLeft / TIME_LIMIT;
    return rawTimeFraction - (1 / TIME_LIMIT) * (1 - rawTimeFraction);
}
// Update the dasharray value as time passes, starting with 283
function setCircleDasharray(timeLeft) {
    var circleDasharray = (calculateTimeFraction(timeLeft) * FULL_DASH_ARRAY).toFixed(0).toString() + ' 283';
    document.getElementById("base-timer-path-remaining").setAttribute("stroke-dasharray", circleDasharray);
}
function setRemainingPathColor(timeLeft) {
    // If the remaining time is less than or equal to 5, remove the "warning" class and apply the "alert" class.
    if (timeLeft <= COLOR_CODES.alert.threshold) {
        document
        .getElementById("base-timer-path-remaining")
        .classList.remove(COLOR_CODES.warning.color);
        document
        .getElementById("base-timer-path-remaining")
        .classList.add(COLOR_CODES.alert.color);

    // If the remaining time is less than or equal to 10, remove the base color and apply the "warning" class.
    } else if (timeLeft <= COLOR_CODES.warning.threshold) {
        document
        .getElementById("base-timer-path-remaining")
        .classList.remove(COLOR_CODES.info.color);
        document
        .getElementById("base-timer-path-remaining")
        .classList.add(COLOR_CODES.warning.color);
    }
}
function setBordersOnAnswer(is_correct) {
    if (is_correct) {
        document.getElementById('pt2-score-circle').classList.remove('incorrect');
        document.getElementById('pt2-score-circle').classList.add('correct');
        document.getElementById('pt2-input').classList.remove('incorrect');
        document.getElementById('pt2-input').classList.add('correct');
    } else {
        document.getElementById('pt2-score-circle').classList.add('incorrect');
        document.getElementById('pt2-score-circle').classList.remove('correct');
        document.getElementById('pt2-input').classList.add('incorrect');
        document.getElementById('pt2-input').classList.remove('correct');
    }
}
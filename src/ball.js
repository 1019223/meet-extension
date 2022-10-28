import { initializeApp } from "@firebase/app";
import { getFirestore, onSnapshot, collection, query, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";


var vad = require('./index.js');

var speechCount = 0;
var conclusion = 0 ;
var shootCount = 0;

var audioContext;

var valueContainer = document.createElement('div');
document.body.appendChild(valueContainer);

var stateContainer = document.createElement('div');
document.body.appendChild(stateContainer);

const firebaseConfig = {
  apiKey: "AIzaSyAtOJhculWFtgeYDFst0KS1I06ZhwbjoPI",
  authDomain: "meet-soccer.firebaseapp.com",
  projectId: "meet-soccer",
  storageBucket: "meet-soccer.appspot.com",
  messagingSenderId: "610808799643",
  appId: "1:610808799643:web:edff941bd59718ebe2813e",
  measurementId: "G-7BWRLTK0S4"
};

//firestoreの初期化
const app = initializeApp(firebaseConfig);
const firestoreDB = getFirestore(app);

//シュート操作のリアルタイムでの変更をDB監視
const q = query(collection(firestoreDB, "players"));
const unsubscribeDbPlayer = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
        console.log("New players: ", change.doc.data());
    }
    if (change.type === "modified") {
        console.log("Modified players: ", change.doc.data());
        if(localStorage.getItem('speechUser')){
          if(change.doc.id != localStorage.getItem('speechUser')){
            console.log("change the world");
            setBall(change.doc.id);
          }
        }else{
          console.log("firstime");
          setBall(change.doc.id);
        }
        localStorage.setItem('speechUser',change.doc.id);
    }
    if (change.type === "removed") {
        console.log("Removed players: ", change.doc.data());
    }
  });
});

//シュート操作のリアルタイムでの変更をDB監視
const r = query(collection(firestoreDB, "shoot"));
const unsubscribeDbShoot = onSnapshot(r, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
        console.log("New shoot: ", change.doc.data());
    }
    if (change.type === "modified") {
      switch(change.doc.id){
        case 'shooter':
          console.log("shooter: ", change.doc.data());
          if((change.doc.data().name != localStorage.getItem('player')) && (change.doc.data().name != "a")){
            setConclusion();
            console.log("シュートが放たれたぁぁぁ！！");
          }
          break
        case 'conclusions':
          goal();
      }
    }
    if (change.type === "removed") {
        console.log("Removed shooter: ", change.doc.data());
    }
  
  });
});

//ボールの生成
var ball_img = document.createElement('img');
ball_img.src = chrome.runtime.getURL("resources/soccer_ball.png");
ball_img.style.display = "none";
ball_img.style.position = "absolute";
ball_img.style.zIndex = "99999";
ball_img.style.width = "100px";
ball_img.onclick = shoot;

//変更があったタイミングで発火
//全参加者のdata-participant-idを取得。DBに変更があった参加者のIDとの部分一致を探して、一致した参加者にボール表示
function setBall(playerId){
  console.log(playerId);
  var ballList = [];
  var ballPosition = document.getElementsByClassName('oZRSLe');
  for( var i = 0; i < ballPosition.length; i++ ){
    ballList.push(ballPosition[i].getAttribute('data-participant-id'));
    console.log(ballList[i]);
    if(ballList[i].indexOf(playerId)>-1){
      console.log("sucess!");
      ballPosition[i].before(ball_img);
      ball_img.style.display = "block";
    }
  }
}

//シューター確認画面
function shoot(){
  var flag = confirm("シュートを打ちますか？");
  if(flag){
    console.log("ファイヤートルネード！！");
    countShoot();
    shootCount += 1;
    console.log(shootCount);
  }else{
    console.log("やめました");
  }
}

//結論に納得するかの確認
function setConclusion(){
  var result = confirm("結論に納得しますか？");

  if(result){
    conclusion = 1;
  }else{
    conclusion = 0;
  }

  countConclusion();
}

//セットボタンクリック時に発火
//data-participant-idを取得、「/」を「-」に変換してドキュメントを作成
function setPlayer(){
  var className = document.getElementsByClassName('oZRSLe'); 
  var classList = [];
  for(var p = 0; p < className.length; p++){
    classList.push(className[p].getAttribute('data-participant-id'));
    var classNameId = classList[p];
  }
  console.log(className);
  var playerId = classNameId.substring(classNameId.indexOf("devices/")+8);
  console.log(playerId);
  setDoc(doc(firestoreDB, "players", playerId),{
    speech: 0
  });
  localStorage.setItem('player',playerId);
  console.log(localStorage.getItem('player'));
}

//各ボタンの生成
const createElements = () => {
  console.log("hello world");
  document.body.insertAdjacentHTML('beforebegin', `
 <div>
 <button id="btn1" style="z-index: 999999; position: absolute;">SET</button>
 <button id="btn2" style="z-index: 999999; position: absolute; left: 4%;">START</button>
 <button id="btn3" style="z-index: 999999; position: absolute; left: 8%;">RESET</button>
 </div>
  `)
}
createElements();

document.querySelector('#btn1').addEventListener("click",()=>{setPlayer();});
document.querySelector('#btn2').addEventListener("click",()=>{requestMic();});
document.querySelector('#btn3').addEventListener("click",()=>{resetShooter();});

//発話回数をDBに保存
async function countPlayer(){
    console.log(firestoreDB, "players", localStorage.getItem('player'));
    const playersRef = doc(firestoreDB, "players", localStorage.getItem('player'))
    await updateDoc(playersRef, {speech: speechCount});
}

//シュートを打った人をDBに保存
async function countShoot(){
  const shootRef = doc(firestoreDB, "shoot", "shooter");
  await updateDoc(shootRef,{
      name: localStorage.getItem('player')
    });
}

async function resetShooter(){
  const shootRef = doc(firestoreDB, "shoot", "shooter");
  await updateDoc(shootRef,{
      name: "a"
    });
}

//納得かどうかをDBに保存
async function countConclusion(){
  const conclusionRef = doc(firestoreDB, "shoot", "conclusions");
  var getConclusion = await getDoc(conclusionRef);
  console.log(getConclusion);
  var sumConclusions =  getConclusion.data().conclusion + conclusion;
  var paricipant = getConclusion.data().conclusion + 1;
  await updateDoc(conclusionRef,{
      conclusion: sumConclusions,
      participants: paricipant
    });
}

//ゴール表示
function goalImg(){
var goal_img = document.createElement('img');
goal_img.src = chrome.runtime.getURL("resources/GOAL.png");
goal_img.style.display = "block";
goal_img.style.position = "absolute";
goal_img.style.zIndex = "99999";
goal_img.style.top = "50%";
goal_img.style.left = "50%";
goal_img.style.transform = "translateY(-50%) translateX(-50%)";
document.body.appendChild(goal_img);
}

//参加者の半数以上の納得が得られた場合にゴール
//ノーゴールかつ会議参加者全員が投票していたら投票内容をリセット
async function goal(){
  var sumPartcipants = document.getElementsByClassName('oZRSLe').length;
  const conclusionRef = doc(firestoreDB, "shoot", "conclusions");
  var isGoal = await getDoc(conclusionRef);
  if(isGoal.data().conclusion > sumPartcipants/2){
    console.log("GOAL GOAL GOAL !!");
    goalImg();
  }else{
    console.log("No Goal");
    if(isGoal.data().participants == sumPartcipants){
      await updateDoc(conclusionRef,{
        participants: 0
      });
    }
  }
}

//マイクのリクエスト
function requestMic() {
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    navigator.getUserMedia({audio: true}, startUserMedia, handleMicConnectError);
  } catch (e) {
    handleUserMediaError();
  }
}

function handleUserMediaError() {
  console.warn('Mic input is not supported by the browser.');
}

function handleMicConnectError() {
  console.warn('Could not connect microphone. Possible rejected by the user or is blocked by the browser.');
}

//音声認識
function startUserMedia(stream) {
  var options = {
    onVoiceStart: function() {
      console.log('voice start');
      speechCount += 1;
      countPlayer();
      stateContainer.innerHTML = 'Voice state: <strong>active</strong>';
    },
    onVoiceStop: function() {
      console.log('voice stop');
      stateContainer.innerHTML = 'Voice state: <strong>inactive</strong>';
    },
    onUpdate: function(val) {
      //console.log('curr val:', val);
      valueContainer.innerHTML = 'Current voice activity value: <strong>' + val + '</strong>';
    }
  };
  vad(audioContext, stream, options);
}
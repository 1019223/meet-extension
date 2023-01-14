import { initializeApp } from "@firebase/app";
import { getFirestore, onSnapshot, collection, query, doc, updateDoc, setDoc, getDoc, deleteField } from "firebase/firestore";


var vad = require('./index.js');

var speechCount = 0; //発話回数
var conclusion = 0;  //結論納得するかどうかの値。1で納得している，0で納得してない
var shootCount = 0; //シュート数
var passCount = 0; //パスを渡した回数
let stop; //発話時間の終了時間を管理
var timerId; //表示時間を管理
var progress; //1発話時間
var totalTalk = 0; //処理前総発話時間 
var talkTime; //前回の発話時間
var totalTalkCount = 0;//処理後総発話時間、DB格納用
var count = 0; //voice stopから動き出すのと前回発話時間が総発話時間がNaNになるのでそれの対策
var averageTime = 0; //発話平均時間
var click = 0;
var stopclick = 0;
var ball_img = document.createElement('img');
var click = 0; //SET1,2の管理に使う
var stopclick = false; //DB書き込みを管理
var ball_img = document.createElement('img'); //サッカーボール
var goal_img = document.createElement('img'); //ゴール画面
var noGoal_img = document.createElement('img'); //ノーゴール画面
var audioContext; 

//称号
var array =[{name : "パサー", imgPath : "resources/パサー.png", achived : false},
{name : "ストライカー", imgPath : "resources/ストライカー.png", achived : false},
{name : "ドリブラー", imgPath : "resources/ドリブラー.png", achived : false },
{name : "凄腕パサー", imgPath : "resources/凄腕パサー.png", achived : false },
{name : "点取り屋", imgPath : "resources/点取り屋.png", achived : false },
{name : "凄腕ドリブラー", imgPath : "resources/凄腕ドリブラー.png", achived : false },
{name : "精密機械", imgPath : "resources/精密機械.png", achived : false },
{name : "爆撃機", imgPath : "resources/爆撃機.png", achived : false },
{name : "ファンタジスタ", imgPath : "resources/ファンタジスタ.png", achived : false },
{name : "サッカーの神様", imgPath : "resources/サッカーの神様.png", achived : false }
]; 

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
       // console.log("New players: ", change.doc.data());
    }
    if (change.type === "modified") {
        //console.log("Modified players: ", change.doc.data());
        setBall(change.doc.id);
        if(localStorage.getItem('speechUser')){
          if(change.doc.id != localStorage.getItem('speechUser')){
            if(localStorage.getItem('speechUser') === localStorage.getItem('player')){
            passCount += 1;
            achive('pass', passCount);
            //console.log("change the world");
            }
          }
        }else{
          //console.log("firstime");
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
        //console.log("New shoot: ", change.doc.data());
    }
    if (change.type === "modified") {
      switch(change.doc.id){
        case 'shooter':
         // console.log("shooter: ", change.doc.data());
          if((change.doc.data().name != localStorage.getItem('player')) && (change.doc.data().name != "a")){
            setConclusion();
            //console.log("シュートが放たれたぁぁぁ！！");
          }
        break
        case 'conclusions':
          goal();
        break
      }
    }
    if (change.type === "removed") {
       // console.log("Removed shooter: ", change.doc.data());
    }
  
  });
});

//変更があったタイミングで発火
//全参加者のdata-participant-idを取得。DBに変更があった参加者のIDとの部分一致を探して、一致した参加者にボール表示
function setBall(playerId){
  if(click >= 1){
    //console.log(playerId);
    var ballList = [];
    var ballPosition = document.getElementsByClassName('oZRSLe');
    for( var i = 0; i < ballPosition.length; i++ ){
      ballList.push(ballPosition[i].getAttribute('data-participant-id'));
      //console.log(ballList[i]);
      if(ballList[i].indexOf(playerId)>-1){
        //console.log("sucess!");
        ballPosition[i].before(ball_img);
        ball_img.style.display = "block";
      }
    }
  } 
}

//シューター確認画面
function shoot(){
  var flag = confirm("シュートを打ちますか？");
  if(flag){
    //console.log("ファイヤートルネード！！");
    countShoot();
    shootCount += 1;
    //console.log(shootCount);
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

//称号を格納してる連想配列のachivedを更新する関数
function achive(behavior, count){
  if(document.getElementById("ballImg") != null){
    //console.log("behavior " + behavior + "count= " + count); 
    switch(behavior){
      case 'pass':
        if(count >= 10 && array[0].achived == false) {
          array[0].achived = true; 
          titleLog();
          //console.log("pass1");
        }
        if(count >= 30 && array[3].achived == false) {
          array[3].achived = true; 
          titleLog();
          //console.log("pass2");
        }
        if(count >= 60 && array[6].achived == false) {
          array[6].achived = true; 
          titleLog();
          achive('god',1);
          //console.log("pass3");
        }
      break
      case 'shoot':
        if(count >= 3 && array[1].achived == false) {
          array[1].achived = true; 
          titleLog();
          //console.log("shoot1");
        }
        if(count >= 4 && array[4].achived == false) {
          array[4].achived = true;
          titleLog();
          //console.log("shoot2");
        }
        if(count >= 5 && array[7].achived == false) {
          array[7].achived = true; 
          titleLog();
          achive('god',1);
          //console.log("shoot3");
        }
      break
      case 'dribble':
        if(count >= 30 && array[2].achived == false) {
          array[2].achived = true; 
          titleLog(); 
          appearTitle(); 
          //console.log("dri1");
        }
        if(count >= 60 && array[5].achived == false) {
          array[5].achived = true; 
          titleLog(); 
          appearTitle();
          //console.log("dri2");
        }
        if(count >= 120 && array[8].achived == false) {
          array[8].achived = true; 
          titleLog(); 
          appearTitle();
          achive('god',1);
          //console.log("dri3");
        }
      break
      case 'god':
        if(array[6].achived == true && array[7].achived == true && array[8].achived == true) { 
          array[9].achived = true; 
          titleLog();
          appearTitle();
          //console.log("god");
        }
      break
    }
  }
}

function appearTitle(){
  array.map(element => 
    {
    if(element.achived){
      if(document.getElementById(element.name) == null){
        var achivedImg = document.createElement('img');
        achivedImg.src = chrome.runtime.getURL(element.imgPath);
        achivedImg.id = element.name;
        achivedImg.style.transform = "translateX(7%)";
        var menuId = document.getElementById('menu');
        menuId.appendChild(achivedImg);
      }
    }
    }
);
}


//称号メニュー
var title_img  = document.createElement('img');
title_img.id = 'titleImg';
title_img.src = chrome.runtime.getURL("resources/title.png");
title_img.style.position = "absolute";
title_img.style.zIndex = "99998";
title_img.style.width = "75px";
title_img.style.left = "85%";
title_img.style.top = "5%";
title_img.onclick = menuOpen;

function menuOpen(){
  //console.log("press");
  var menuId = document.getElementById('menu');
  if(menuId.style.display == "block"){
      menuId.style.display = "none";
      //console.log("aa");
  }else{
      menuId.style.display = "block";
      appearTitle();
  }
}

//実験1用のセット
//セットボタンクリック時に発火
//data-participant-idを取得、「/」を「-」に変換してドキュメントを作成
function setPlayer1(){
  var className = document.getElementsByClassName('oZRSLe'); 
  var classList = [];
  for(var p = 0; p < className.length; p++){
    classList.push(className[p].getAttribute('data-participant-id'));
    var classNameId = classList[p];
  }
  //console.log(className);
  var playerId = classNameId.substring(classNameId.indexOf("devices/")+8);
  console.log("あなたのIDは "+ playerId );
  setDoc(doc(firestoreDB, "players", playerId),{
    speech: speechCount
  });
  setDoc(doc(firestoreDB, "meetingBehavior1", playerId),{
    speech: speechCount,
    shoot: shootCount,
    pass: passCount,
    talk: totalTalkCount,
    averageTalk: averageTime
  });
  localStorage.setItem('player',playerId);
  //console.log(localStorage.getItem('player'));
}

//実験2用、各パラメータを初期化して生成
//セットボタンクリック時に発火
//data-participant-idを取得、「/」を「-」に変換してドキュメントを作成
//称号メニューボタン生成
function setPlayer2(){
  stopclick = 0;
  ball_img.id = "ballImg";
  ball_img.src = chrome.runtime.getURL("resources/soccer_ball.png");
  ball_img.style.display = "none";
  ball_img.style.position = "absolute";
  ball_img.style.zIndex = "99999";
  ball_img.style.width = "100px";
  ball_img.onclick = shoot;
  if(click == 0){
    speechCount = 0;
    shootCount = 0;
    passCount = 0;
    totalTalk = 0;
    averageTime = 0; 
  }
  var className = document.getElementsByClassName('oZRSLe'); 
  var classList = [];
  for(var p = 0; p < className.length; p++){
    classList.push(className[p].getAttribute('data-participant-id'));
    var classNameId = classList[p];
    className[p].before(title_img);
  }
  if(document.getElementById("menu") == null){
    var menu = document.createElement('div');
    menu.className = "menu";
    menu.id = "menu";
    menu.style.position = "absolute";
    menu.style.zIndex = "99999";
    menu.style.backgroundColor = "black";
    menu.style.width = "500px";
    menu.style.height = "300px";
    menu.style.left = "50%";
    menu.style.top = "40%";
    menu.style.transform = "translateY(-50%) translateX(-50%)";
    menu.style.border = "1px solid white";
    menu.style.overflowX = "auto";
    menu.style.display = "none";
    document.body.prepend(menu);
}
  //console.log(className);
  var playerId = classNameId.substring(classNameId.indexOf("devices/")+8);
  console.log("あなたのIDは "+ playerId );
  setDoc(doc(firestoreDB, "players", playerId),{
    speech: speechCount
  });
  setDoc(doc(firestoreDB, "meetingBehavior2", playerId),{
    speech: speechCount,
    shoot: shootCount,
    pass: passCount,
    talk: totalTalkCount,
    averageTalk: averageTime
  });
  localStorage.setItem('player',playerId);
  //console.log(localStorage.getItem('player'));
  click++;
}

//各ボタンの生成
const createElements = () => {
  document.body.insertAdjacentHTML('beforebegin', `
 <div>
 <button id="btn1" style="z-index: 999999; position: absolute;">SET1</button>
 <button id="btn2" style="z-index: 999999; position: absolute; left: 4%;">SET2</button>
 <button id="btn3" style="z-index: 999999; position: absolute; left: 8%;">STOP</button>
 <button id="btn4" style="z-index: 999999; position: absolute; left: 12%;">START</button>
 </div>
  `)
}
createElements();

document.querySelector('#btn1').addEventListener("click",()=>{setPlayer1();});
document.querySelector('#btn2').addEventListener("click",()=>{setPlayer2();});
document.querySelector('#btn3').addEventListener("click",()=>{timeStop();});
document.querySelector('#btn4').addEventListener("click",()=>{requestMic();});
//document.querySelector('#btn5').addEventListener("click",()=>{resetShooter();});

//DBに書き込みを管理
function timeStop(){
  stopclick++;
}

//発話回数をDBに保存
async function countPlayer(){
    //console.log(firestoreDB, "players", localStorage.getItem('player'));
    const playersRef = doc(firestoreDB, "players", localStorage.getItem('player'))
    await updateDoc(playersRef, {speech: speechCount});
}

//シュートを打った人をDBに保存
async function countShoot(){
  const shootRef = doc(firestoreDB, "shoot", "shooter");
  const conclusionRef = doc(firestoreDB, "shoot", "conclusions");
  await updateDoc(shootRef,{
      name: localStorage.getItem('player')
    });
  await updateDoc(conclusionRef,{
      conclusion: 1
    });
}

/*//シューターをリセット
async function resetShooter(){
  const shootRef = doc(firestoreDB, "shoot", "shooter");
  await updateDoc(shootRef,{
      name: "a"
    });
}*/

//納得かどうかをDBに保存
async function countConclusion(){
  const conclusionRef = doc(firestoreDB, "shoot", "conclusions");
  var getConclusion = await getDoc(conclusionRef);
  //console.log(getConclusion);
  var sumConclusions =  getConclusion.data().conclusion + conclusion;
  var paricipant = getConclusion.data().conclusion + 1;
  await updateDoc(conclusionRef,{
      conclusion: sumConclusions,
      participants: paricipant
    });
}

//会議行動をDBに書き込み
async function countMeetingBehabior(){
  if(click == 0 && stopclick == 0){
  const meetingBehavior1Ref = doc(firestoreDB, "meetingBehavior1", localStorage.getItem('player') );
  await updateDoc(meetingBehavior1Ref,{
    speech: speechCount,
    shoot: shootCount,
    pass: passCount,
    talk: totalTalkCount,
    averageTalk: averageTime
    });
  }
  else if(click >= 1 && stopclick == 0){
    const meetingBehavior2Ref = doc(firestoreDB, "meetingBehavior2", localStorage.getItem('player') );
    await updateDoc(meetingBehavior2Ref,{
      speech: speechCount,
      shoot: shootCount,
      pass: passCount,
      talk: totalTalkCount,
      averageTalk: averageTime
      });
  }
}

//称号通知HTML要素
var title = document.createElement('dialog');
var titleGet = document.createElement('audio');
titleGet.src = chrome.runtime.getURL("resources/titleGet.mp3");
title.id = 'achievement' 
title.innerHTML = "称号を獲得しました"
title.width = "250px";
title.padding = "30px 20px";
title.style.zIndex = "999999";
document.body.prepend(title);

//称号通知
function titleLog(){
  if(document.getElementById("ballImg") != null){
  title.show();
  titleGet.play();
  clearTimeout( timerId ); 
  timerId = setTimeout( close , 2000 );
  }
}

//称号通知 & ゴール表示ストップ
function close(){
  title.close();
  if(goal_img.style.zIndex != "1" ){
    goal_img.style.zIndex = "1";
  }
  if(noGoal_img.style.zIndex != "1" ){
    noGoal_img.style.zIndex = "1";
  }
}


//ゴール表示
function goalImg(){
goal_img.id = "goalImg"
goal_img.src = chrome.runtime.getURL("resources/GOAL.png");
goal_img.style.display = "block";
goal_img.style.position = "absolute";
goal_img.style.zIndex = "99999";
goal_img.style.top = "50%";
goal_img.style.left = "50%";
goal_img.style.transform = "translateY(-50%) translateX(-50%)";
document.body.prepend(goal_img);
timerId = setTimeout(close, 3000);
countMeetingBehabior();
}

function noGoalImg(){
  noGoal_img.id = "goalImg"
  noGoal_img.src = chrome.runtime.getURL("resources/noGoal.png");
  noGoal_img.style.display = "block";
  noGoal_img.style.position = "absolute";
  noGoal_img.style.zIndex = "99999";
  noGoal_img.style.top = "50%";
  noGoal_img.style.left = "50%";
  noGoal_img.style.transform = "translateY(-50%) translateX(-50%)";
  document.body.prepend(noGoal_img);
  timerId = setTimeout(close, 3000);
  }

//参加者の半数以上の納得が得られた場合にゴール
//ノーゴールかつ会議参加者全員が投票していたら投票内容をリセット
async function goal(){
  var sumPartcipants = document.getElementsByClassName('oZRSLe').length;
  const conclusionRef = doc(firestoreDB, "shoot", "conclusions");
  const shooterRef = doc(firestoreDB, "shoot", "shooter");
  var isGoal = await getDoc(conclusionRef);
  var shooter = await getDoc(shooterRef);
  if(isGoal.data().conclusion >= sumPartcipants/2){
    //console.log("GOAL GOAL GOAL !!");
    if(isGoal.data().participants == sumPartcipants){
      goalImg();
      if(shooter == localStorage.getItem('player')){
      achive('shoot', isGoal.data().conclusion);
      }
    }
  }else{
    //console.log("No Goal");
    if(isGoal.data().participants == sumPartcipants){
      noGoalImg();
      await updateDoc(conclusionRef,{
        conclusion: 0,
        participants: 0
      });
      await updateDoc(shooterRef,{
        name: "a"
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

//発話時間計測
function timer() {
  const start = new Date().getTime();
  stop = setInterval(function() {
    progress = new Date().getTime() - start ;
    talkTime = new Date().getTime() - start + totalTalk;
    const nos = Math.trunc(progress / 1000);
    const nosTalkTime = Math.trunc(talkTime / 1000);
    const second = nos % 86400 % 3600 % 60;
    const secondTalkTime = nosTalkTime % 86400 % 3600 % 60;
    const minuteTalkTime = Math.trunc((nosTalkTime % 86400 % 3600 / 60));
    //console.log( minute + ":" + second );
    //console.log( minuteTalkTime + ":" + secondTalkTime);
    averageTime = (60 * minuteTalkTime + secondTalkTime + second) / speechCount; 
    totalTalkCount = minuteTalkTime*60 + secondTalkTime;
    achive('dribble', totalTalkCount); 
    },10)   
}

//音声認識
//音声認識時にプレイヤーの発話をカウント、DBに格納する関数を発火
//発話時間計測関数の発火
function startUserMedia(stream) {
  var options = {
    onVoiceStart: function() {
      //console.log('voice start');
      speechCount += 1;
      countPlayer();
      timer();
      stateContainer.innerHTML = 'Voice state: <strong>active</strong>';
    },
    onVoiceStop: function() {
      //console.log('voice stop');
      clearInterval(stop);
      if(count != 0){
        totalTalk = talkTime;
      }
      count++;
      countMeetingBehabior();
      stateContainer.innerHTML = 'Voice state: <strong>inactive</strong>';
    },
    onUpdate: function(val) {
      //console.log('curr val:', val);
      valueContainer.innerHTML = 'Current voice activity value: <strong>' + val + '</strong>';
    }
  };
  vad(audioContext, stream, options);
}
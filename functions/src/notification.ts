import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Change } from 'firebase-functions';
import { f } from './index';
import { db } from './index';
import { writeStatus } from './index';
type DocData = admin.firestore.DocumentData;
type DocSnapshot<T = DocData> = admin.firestore.DocumentSnapshot<T>;
type EventContext = functions.EventContext;

//****************************** 予定が登録/更新されたら通知を送る ******************************//
export const notifyEvent = f.firestore.document('Groups/{groupID}/Events/{eventID}').onWrite((change, context) => {
  //console.log('Event onWrite');
  sendNotification(change, context, 'Event');
});

//****************************** 連絡が登録/更新されたら通知を送る ******************************//
export const notifyMail = f.firestore.document('Groups/{groupID}/Mails/{mailID}').onWrite((change, context) => {
  //console.log('Mail onWrite');
  sendNotification(change, context, 'Mail');
});

//****************************** （共通関数）通知を送る ******************************//
const sendNotification = async (change: Change<DocSnapshot>, context: EventContext, type: String) => {
  
  //============================== 新規/更新/削除を判定 ==============================//
  let bodyText = '';
  const {before, after} = change;
  const status = writeStatus(before, after);
  if (status === 'create') {
    if(type === 'Event') bodyText = '新しい予定が登録されました';
    if(type === 'Mail') bodyText = '新しい連絡が投稿されました';
  };
  if (status === 'update') {
    if(type === 'Event') bodyText = '予定が更新されました';
    if(type === 'Mail') bodyText = '連絡が更新されました';
  };
  if (status === 'delete') {
    return;
  };

  //============================== 通知内容の定義 ==============================//
  const notifMsg = {
    notification: {
      title: change.after.data()!.OwnerName,
      body: bodyText,
      sound: 'default',           // 受信時の通知音
      mutable_content: 'true',    // 画像付きのリッチプッシュに必要
      content_available: 'true'   // アプリがバックグラウンドでも通知を届けるために必要
    }
  };
  const dataMsg = {
    data: {
      ownerID: change.after.data()!.OwnerID,
      title: change.after.data()!.OwnerName,
      body: bodyText,
      sound: 'default',           // 受信時の通知音
      mutable_content: 'true',    // 画像付きのリッチプッシュに必要
      content_available: 'true'   // アプリがバックグラウンドでも通知を届けるために必要
    }
  };
  const options = {
    priority: 'high'
  };

  //============================== 通知を送る対象デバイス(楽団員のFCMトークン)をFirestoreから読み取り) ==============================//
  const groupID = context.params.groupID;
  const lastUpdatedByID = change.after.data()!.LastUpdatedByID;
  //console.log('LastUpdatedByID: ', lastUpdatedByID);
  const memberTokenRef = db.collection('Groups').doc(groupID).collection('Members').doc('TokenDocument');
  await memberTokenRef.get()
  .then((targetDoc) => {

    //------------------------------ ドキュメントが存在しない場合は終了 ------------------------------//
    if (!targetDoc.exists) { return; };
    //console.log('MemberTokens gotten');

    //------------------------------ 通知対象をユーザごとにリスト化してforEach ------------------------------//
    let numA1 = 0;
    let numA2 = 0;
    let numB1 = 0;
    let numB2 = 0;
    const userList = new Map<string, Map<string, string>>(Object.entries(targetDoc.data()!));
    userList.forEach((tokenMap: Map<string, string>, userID: string) => {
      
      //---------- 作成/更新/削除したユーザには通知をしない ----------//
      if(userID === lastUpdatedByID) {
        console.log('Noification is not sent to this user: ', userID);
        //return;
      };
      
      //---------- 通知対象をデバイス(トークン)ごとにリスト化してforEach ----------//
      //console.log('tokenMap:', JSON.stringify(tokenMap));
      const tokenList = new Map<string, string>(Object.entries(tokenMap));
      tokenList.forEach((token: string) => {
        
        //~~~~~~~~~~ tokenが空文字の場合次のtokenへ(forEach内ではcontinueではなくreturnが正しい) ~~~~~~~~~~//
        if (token === '' || token === 'unknown') { return; }
        //console.log('token:', token);

        //~~~~~~~~~~ メッセージの送信 ~~~~~~~~~~//
        admin.messaging().sendToDevice(token, notifMsg, options)
        .then((response) => {
          numA1++;
          console.log('Message successfully sent to (', numA1,') ', token);
        })
        .catch((error) => {
          numA2++;
          console.log('<ERROR> message: (', numA2,') ', error);
        });

        //~~~~~~~~~~ データの送信 ~~~~~~~~~~//
        admin.messaging().sendToDevice(token, dataMsg, options)
        .then((response) => {
          numB1++;
          console.log('Data successfully sent to (', numB1,') ', token);
        })
        .catch((error) => {
          numB2++;
          console.log('<ERROR> data: (', numB2,') ', error);
        });
      });
    });
  })
  .catch((error) => {
    console.log('<ERROR> Member tokens ', error);
  });
};
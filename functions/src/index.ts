import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as firebase from "@firebase/testing";

admin.initializeApp();

const tools = require('firebase-tools');
const f = functions.region('asia-northeast1');
const db = admin.firestore();
db.settings({
  ignoreUndefinedProperties: true,
});

// Authからユーザが消えたらUsersからも消す
// 以下実施してからじゃないとダメ
// firebase login:ci
// firebase functions:config:set fb.token="{Token}"
export const deleteUserBasedOnAuth = f.auth.user().onDelete(async (user) => {
  // 削除されたuid
  const path = `Users/${user.uid}`;
  try {
    await tools.firestore
    .delete(path, {
      project: process.env.GCLOUD_PROJECT,
      recursive: true,
      yes: true,
      token: functions.config().fb.token
    })
  } catch (err) {
    console.error(err)
  }
});

// Group以下の情報が更新されたら該当するUsers/Groups/{groupID}を更新する
export const syncGroup = f.firestore.document('Groups/{groupID}').onUpdate((change, context) => {
  // 更新されたgroupID
  const groupID = context.params.groupID;

  // 更新データ
  const newGroupName = change.after.data().GroupName;
  const newGroupNameEng = change.after.data().GroupNameEng;
  const newPassword = change.after.data().GroupPassword;

  // ユーザ全員取得→サブコレクションのGroupsに該当のgroupIDがあったら更新
  // ユーザのFieldにbelongingGroupsでgroupID持たせておいた方が楽そう
  const userRef = db.collection('Users');
  userRef.get()
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      const userID = doc.id;
      const userGroupRef = userRef.doc(userID).collection('MyGroups').doc(groupID);
      userGroupRef.get()
      .then((targetDoc) => {
        if (targetDoc.exists) {
          userGroupRef.set({
            GroupName: newGroupName,
            GroupNameEng: newGroupNameEng,
            GroupPassword: newPassword,
          }, {merge: true});
        }
      })
      .catch((error) => {
        console.log('Users/Groups get error');
        console.log(error);
      });
    });
  })
  .catch((error) => {
    console.log('Users get error');
    console.log(error);
  });
});

type DocData = admin.firestore.DocumentData;
type DocSnapshot<T = DocData> = admin.firestore.DocumentSnapshot<T>;
const writeStatus = (before: DocSnapshot, after: DocSnapshot) => {
  if (!before.exists) return 'create';
  if (!after.exists) return 'delete';
  return 'update';
};

// Users以下の出欠情報(MyAttendane)が更新されたら該当するGroups/{groupID}/Events/{eventID}/Attendees/AttendeeDocumentを更新する
export const syncAttendance = f.firestore.document('Users/{userID}/MyAttendance/{groupID}').onWrite(async (change, context) => {
  // 更新したuserとgroup
  const userID = context.params.userID;
  const groupID = context.params.groupID;

  // 更新か削除か新規か判定
  const {before, after} = change;
  const status = writeStatus(before, after);
  let oldAttendance = new Map<string, AttendanceData>();
  let newAttendance = new Map<string, AttendanceData>();
  if (status === 'create') {
    newAttendance = new Map<string, AttendanceData>(Object.entries(change.after.data()!));
  }
  if (status === 'update') {
    oldAttendance = new Map<string, AttendanceData>(Object.entries(change.before.data()!));
    newAttendance = new Map<string, AttendanceData>(Object.entries(change.after.data()!));
  }
  if (status === 'delete') {
    return;
  }

  console.log("newAttendance:", JSON.stringify([...newAttendance]));

  // 更新データをイベントごとに分割
  for (const [_, attendance] of newAttendance) {
    console.log("attendance:", JSON.stringify(attendance));
    // 出欠変更のない予定は更新しない
    const eventID = attendance.EventID;
    if (oldAttendance.has(eventID)) {
      const old: AttendanceData = oldAttendance.get(eventID)!;
      console.log("old:", JSON.stringify(old));
      if (attendance.MyAttendanceText === old.MyAttendanceText && attendance.MyAttendanceType === old.MyAttendanceType) {
        console.log("SAME!!!");
        continue;
      }
    }

    // 更新
    console.log("UPDATE!!!");
    const eventRef = db.collection('Groups').doc(groupID).collection('Events').doc(eventID).collection('Attendees').doc('AttendeeDocument');
    const data = new AttendeeData(userID, attendance.MyAttendanceType, attendance.MyAttendanceText);

    console.log("data:", JSON.stringify(data));

    await eventRef.set({[userID]: {...data}}, {merge: true});
  }
});

class AttendanceData {
  EventID = ""
  MyAttendanceType = 0
  MyAttendanceText = ""

  constructor(EventID: string, MyAttendanceType: number, MyAttendanceText: string) {
    this.EventID = EventID;
    this.MyAttendanceType = MyAttendanceType;
    this.MyAttendanceText = MyAttendanceText;
  }
}

class AttendeeData {
  AttendeeID = ""
  AttendeeAttendanceType = 0
  AttendeeAttendanceText = ""

  constructor(AttendeeID: string, AttendeeAttendanceType: number, AttendeeAttendanceText: string) {
    this.AttendeeID = AttendeeID;
    this.AttendeeAttendanceType = AttendeeAttendanceType;
    this.AttendeeAttendanceText = AttendeeAttendanceText;
  }
}

// 予定が登録されたら通知を送る
export const sendNotification = functions.database.ref('Groups/{groupID}/Events/{eventID}')
.onCreate(async (snapshot: any, context: any) => {

  console.log("Event onCreate");

  // 通知データ
  const message = {
    notification: {
      title: snapshot.val().OwnerName,
      body: "新しい予定が登録されました",
      sound: "default",           // 受信時の通知音
      mutable_content: 'true',    // 画像付きのリッチプッシュに必要
      content_available: 'true'   // アプリがバックグラウンドでも通知を届けるために必要
    }
  };
  const options = {
    priority: "high",
  };

  // 通知を送る対象(Firestoreから所属団員を読み取り)
  let num = 0
  const groupID = context.params.groupID;
  const groupMemberRef = db.collection('Groups').doc(groupID).collection('Members').doc('MemberDocument');
  groupMemberRef.get()
  .then((targetDoc) => {
    if (targetDoc.exists) {

      console.log("Groups/Members gotten");
      let dataList = new Map<string, MemberData>();
      dataList = new Map<string, MemberData>(Object.entries(targetDoc.data()!));

      dataList.forEach((member: MemberData) => {

        console.log("member:", JSON.stringify(member));

        // ユーザごとにTokenを取得
        //admin.auth().getUser(member.MemberID)

        // ユーザごとにTokenを生成
        // ここから先検討中
        /*admin.auth().createCustomToken(member.MemberID)
          .then((customToken) => {

              // ユーザごとに通知を送信
              if (customToken != "") {
                admin.messaging().sendToDevice(customToken, message, options)
                  .then((response) => {
                    console.log('Successfully sent message:', response);
                    //return Promise.resolve(null)
                  })
                  .catch((error) => {
                    console.log('Error sending message:', error);
                    //return Promise.reject("Error")
                  });
              }

              //if (num === dataList.size) { return Promise.all(promises) }
              num++;
          })
          .catch((error) => {
            console.log('customToken error');
            console.log(error);
          });*/
      });
    }
  })
  .catch((error) => {
    console.log('Groups/Members get error');
    console.log(error);
  });
});

class MemberData {
  MemberID = ""
  MemberName = ""

  constructor(MemberID: string, MemberName: string) {
    this.MemberID = MemberID;
    this.MemberName = MemberName;
  }
};

class DeviceData {
  FirstUpdatedOn = firebase.firestore.FieldValue.serverTimestamp()
  LastUpdatedOn = firebase.firestore.FieldValue.serverTimestamp()
  MyDeviceType = ""
  MyFCMToken = ""
  MyUDID = ""

  constructor(
    FirstUpdatedOn: firebase.firestore.Timestamp,
    LastUpdatedOn: firebase.firestore.Timestamp,
    MyDeviceType: string,
    MyFCMToken: string,
    MyUDID: string
  ) {
    this.FirstUpdatedOn = FirstUpdatedOn
    this.LastUpdatedOn = LastUpdatedOn
    this.MyDeviceType = MyDeviceType
    this.MyFCMToken = MyFCMToken
    this.MyUDID = MyUDID
  }
}

class MyGroup {
  MyGroupID = ""
  MyGroupName = ""
  MyGroupPassword = ""
  MyJoiningDate = firebase.firestore.FieldValue.serverTimestamp()
  MyMemberType = ""
  MyPart = ""
  MyRole = ""

  constructor(
    MyGroupID: string,
    MyGroupName: string,
    MyGroupPassword: string,
    MyJoiningDate: firebase.firestore.Timestamp,
    MyMemberType: string,
    MyPart: string,
    MyRole: string
  ) {
    this.MyGroupID = MyGroupID
    this.MyGroupName = MyGroupName
    this.MyGroupPassword = MyGroupPassword
    this.MyJoiningDate = MyJoiningDate
    this.MyMemberType = MyMemberType
    this.MyPart = MyPart
    this.MyRole = MyRole
  }
}

export const syncToken = f.firestore.document('Users/{userID}/MyDevice/MyDeviceDocument').onWrite(async (change, context) => {
  // 更新したuserとgroup
  const userID = context.params.userID;

  // 更新か削除か新規か判定
  const {before, after} = change;
  const status = writeStatus(before, after);
  let oldDev = new Map<string, DeviceData>();
  let newDev = new Map<string, DeviceData>();
  if (status === 'create') {
    newDev = new Map<string, DeviceData>(Object.entries(change.after.data()!));
  }
  if (status === 'update') {
    oldDev = new Map<string, DeviceData>(Object.entries(change.before.data()!));
    newDev = new Map<string, DeviceData>(Object.entries(change.after.data()!));
  }
  if (status === 'delete') {
    return;
  }

  console.log("device update\nnew:", JSON.stringify([...newDev]));
  console.log("old:", JSON.stringify([...oldDev]));

  // 更新データをUDIDで分割
  // 更新対象のデバイスを取得
  let tokenDocument = new Map<string, Map<string, string>>();
  let devices = new Map<string, string>();
  for (const [_, device] of newDev) {
    console.log("device:", JSON.stringify(device));
    // 出欠変更のない予定は更新しない
    const deviceUDID = device.MyUDID;
    if (oldDev.has(deviceUDID)) {
      const old: DeviceData = oldDev.get(deviceUDID)!;
      console.log("old:", JSON.stringify(old));
      if (device.MyFCMToken === old.MyFCMToken && device.MyDeviceType === old.MyDeviceType) {
        console.log("SAME!!!");
        continue;
      }
    }
    devices.set(deviceUDID, device.MyFCMToken);
  }
  tokenDocument.set(userID, devices);
  console.log("tokenDocument:", JSON.stringify([...tokenDocument]));

  // 所属グループごとに更新していく
  const myGroupRef = db.collection('Users')
  .doc(userID)
  .collection('MyGroups')
  .doc('MyGroupDocument');

  myGroupRef.get()
  .then((querySnapshot) => {
    if (querySnapshot.exists) {
      let myGroups = new Map<string, MyGroup>(Object.entries(querySnapshot.data()!));
      for (const [_, group] of myGroups) {
        console.log('start group:', group.MyGroupName)

        const tokenRef = db.collection('Groups')
        .doc(group.MyGroupID)
        .collection('Members')
        .doc('TokenDocument');

        await tokenRef.set({...tokenDocument}, {merge: true});
      }
    } else {
      console.log("There are no groups")
    }
  })
  .catch((error) => {
    console.log('MyGroups get error');
    console.log(error);
  });


}

// ユーザ名が変更されたらメンバー名を変更する
//export const updateMamberNameWhenUserNameChanged = f.auth.user().onDelete(async (user) => {
//});

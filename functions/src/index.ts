import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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

// Users以下の出欠情報(MyAttendane)が更新されたら該当するGroups/{groupID}/Events/{eventID}/Attendees/AttendeeDocumentを更新する
export const syncAttendance = f.firestore.document('Users/{userID}/MyAttendance/{groupID}').onUpdate((change, context) => {
  // 更新したuserとgroup
  const userID = context.params.userID;
  const groupID = context.params.groupID;

  // 更新データ
  const oldAttendance = change.before.data() as Map<string, attendanceData>;
  const newAttendance = change.after.data() as Map<string, attendanceData>;

  console.log("type:", typeof newAttendance);
  console.log("values:", newAttendance.values());

  // 更新データをイベントごとに分割
  for(const attendance of newAttendance.values()) {
    console.log(`attendance: ${attendance}`);
    // 出欠変更のない予定は更新しない
    const eventID = attendance.EventID;
    if (oldAttendance.has(eventID)) {
      const old: attendanceData = oldAttendance.get(eventID)!;
      if(attendance.Attendance == old.Attendance && attendance.AttendText == old.AttendText) continue;
    }

    // 更新
    const eventRef = db.collection('Groups').doc(groupID).collection('Events').doc(eventID).collection('Attendees').doc('AttendeeDocument');
    const data = attendeeData.apply({
      AttendeeID: userID,
      Attendance: attendance.Attendance,
      AttendText: attendance.AttendText
    });

    console.log(`data: ${data}`);

    eventRef.set({eventID: data}, {merge: true});
  }
});

class attendanceData {
  EventID = ""
  Attendance = 0
  AttendText = ""
}

class attendeeData {
  AttendeeID = ""
  Attendance = 0
  AttendText = ""
}
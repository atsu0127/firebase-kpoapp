import { f } from './index'
import { db } from './index'
import { writeStatus } from './index'

//****************************** MyAttendaneが更新されたらAttendeeDocumentを更新する ******************************//
export const syncAttendance = f.firestore.document('Users/{userID}/MyAttendance/{groupID}').onWrite(async (change, context) => {

  const userID = context.params.userID;
  const groupID = context.params.groupID;

  //============================== 新規/更新/削除を判定(単一ドキュメントなので原則「Update」になる) ==============================//
  const { before, after } = change;
  const status = writeStatus(before, after);
  let oldAttendance = new Map<string, AttendanceData>();
  let newAttendance = new Map<string, AttendanceData>();
  if (status === 'create') {
    newAttendance = new Map<string, AttendanceData>(Object.entries(change.after.data()!));
  };
  if (status === 'update') {
    oldAttendance = new Map<string, AttendanceData>(Object.entries(change.before.data()!));
    newAttendance = new Map<string, AttendanceData>(Object.entries(change.after.data()!));
  };
  if (status === 'delete') {
    return;
  };
  //console.log('newAttendance:', JSON.stringify([...newAttendance]));

  //============================== MyAttendance(New)を予定ごとに分割 ==============================//
  for (const [_, attendance] of newAttendance) {
    //console.log('attendance:', JSON.stringify(attendance));
    const eventID = attendance.EventID;

    //------------------------------ 予定が変更前後両方に存在する場合 ------------------------------//
    if (oldAttendance.has(eventID)) {
      const old: AttendanceData = oldAttendance.get(eventID)!;
      //console.log('old:', JSON.stringify(old));

      //~~~~~~~~~~ 出欠内容に変更のない予定は更新しない ~~~~~~~~~~//
      if (attendance.MyAttendanceText === old.MyAttendanceText && attendance.MyAttendanceType === old.MyAttendanceType) {
        //console.log('SAME');
        continue;
      };
    };

    //------------------------------ 更新 ------------------------------//
    console.log('UPDATE: Attendees of ', eventID);
    const eventRef = db.collection('Groups').doc(groupID).collection('Events').doc(eventID).collection('Attendees').doc('AttendeeDocument');
    const data = new AttendeeData(userID, attendance.MyAttendanceType, attendance.MyAttendanceText);
    //console.log('data:', JSON.stringify(data));
    await eventRef.set({[userID]: {...data}}, {merge: true});
  };
});

//****************************** 自分の出欠データ ******************************//
class AttendanceData {
  EventID = '';
  MyAttendanceType = 0;
  MyAttendanceText = '';

  constructor(EventID: string, MyAttendanceType: number, MyAttendanceText: string) {
    this.EventID = EventID;
    this.MyAttendanceType = MyAttendanceType;
    this.MyAttendanceText = MyAttendanceText;
  };
};

//****************************** 出欠者データ ******************************//
class AttendeeData {
  AttendeeID = '';
  AttendeeAttendanceType = 0;
  AttendeeAttendanceText = '';

  constructor(AttendeeID: string, AttendeeAttendanceType: number, AttendeeAttendanceText: string) {
    this.AttendeeID = AttendeeID;
    this.AttendeeAttendanceType = AttendeeAttendanceType;
    this.AttendeeAttendanceText = AttendeeAttendanceText;
  };
};

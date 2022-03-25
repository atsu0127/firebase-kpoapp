import * as admin from 'firebase-admin';
import { f } from './index';
import { db } from './index';
import { writeStatus } from './index';

//****************************** MyDeviceDocumentが更新/削除されたら所属楽団内のFCMトークンを更新/削除 ******************************//
export const syncToken = f.firestore.document('Users/{userID}/MyDevices/MyDeviceDocument').onWrite(async (change, context) => {
  
  const userID = context.params.userID;

  //============================== 新規/更新/削除を判定(単一ドキュメントなので原則「Update」になる) ==============================//
  const { before, after } = change;
  const status = writeStatus(before, after);
  let deleteFlg = false;
  let newDev = new Map<string, DeviceData>();
  if (status === 'create') {
    newDev = new Map<string, DeviceData>(Object.entries(change.after.data()!));
  };
  if (status === 'update') {
    newDev = new Map<string, DeviceData>(Object.entries(change.after.data()!));
    if(newDev.size == 0) {
      deleteFlg = true;
    };
  };
  if (status === 'delete') {
    deleteFlg = true;
  };
  //console.log('new devices:', JSON.stringify([...newDev]));

  //============================== MyDeviceDocumentをUDIDごとに分割 ==============================//
  let devices = new Map<string, string>();
  if (!deleteFlg) {
    for (const [_, device] of newDev) {
      //console.log('my devices:', JSON.stringify(device));
      devices.set(device.MyUDID, device.MyFCMToken);
    };
  };

  //============================== 所属楽団を取得 ==============================//
  const myGroupRef = db.collection('Users').doc(userID).collection('MyGroups').doc('MyGroupDocument');
  myGroupRef.get().then(async (querySnapshot) => {

    //------------------------------ 楽団に所属していない時 ------------------------------//
    if (!querySnapshot.exists) {
      console.log('No group');
      return;
    };

    //------------------------------ 所属楽団ごとに自分の全てのTokenを一括更新 ------------------------------//
    let myGroups = new Map<string, MyGroup>(Object.entries(querySnapshot.data()!));
    for (const [_, group] of myGroups) {
      console.log('group name:', group.MyGroupName);

      //~~~~~~~~~~ 自分の全てのTokenを削除する（新規/更新時も） ~~~~~~~~~~//
      const tokenRef = db.collection('Groups').doc(group.MyGroupID).collection('Members').doc('TokenDocument');
      await tokenRef.set({[userID]: admin.firestore.FieldValue.delete()}, {merge: true});

      //~~~~~~~~~~ 自分の全てのTokenを登録する ~~~~~~~~~~//
      if (!deleteFlg) {
        //console.log('my devices:', JSON.stringify(mapToObject(devices)));
        await tokenRef.set({[userID]: mapToObject(devices)}, {merge: true});
      };
    };
  })
  .catch((error) => {
    console.log('MyGroups get error');
    console.log(error);
  });
});

//****************************** マップをオブジェクト化する関数 ******************************//
const mapToObject = (map: Map<string, string>) => 
  [...map].reduce((l, [k, v]) => Object.assign(l, {[k]: v}), {});

//****************************** 自分のデバイスデータ ******************************//
class DeviceData {
  LastUpdatedOn = admin.firestore.FieldValue.serverTimestamp();
  MyDeviceType = '';
  MyFCMToken = '';
  MyUDID = '';

  constructor(
    LastUpdatedOn: admin.firestore.Timestamp,
    MyDeviceType: string,
    MyFCMToken: string,
    MyUDID: string
  ) {
    this.LastUpdatedOn = LastUpdatedOn;
    this.MyDeviceType = MyDeviceType;
    this.MyFCMToken = MyFCMToken;
    this.MyUDID = MyUDID;
  };
};

//****************************** 所属団体データ ******************************//
class MyGroup {
  MyGroupID = '';
  MyGroupName = '';
  MyGroupPassword = '';
  MyJoiningDate = admin.firestore.FieldValue.serverTimestamp();
  MyMemberType = '';
  MyPart = '';
  MyRole = '';

  constructor(
    MyGroupID: string,
    MyGroupName: string,
    MyGroupPassword: string,
    MyJoiningDate: admin.firestore.Timestamp,
    MyMemberType: string,
    MyPart: string,
    MyRole: string
  ) {
    this.MyGroupID = MyGroupID;
    this.MyGroupName = MyGroupName;
    this.MyGroupPassword = MyGroupPassword;
    this.MyJoiningDate = MyJoiningDate;
    this.MyMemberType = MyMemberType;
    this.MyPart = MyPart;
    this.MyRole = MyRole;
  };
};
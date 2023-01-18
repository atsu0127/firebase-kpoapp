import * as functions from 'firebase-functions';
import { f } from './index';
import { db } from './index';
import { writeStatus } from './index';
const tools = require('firebase-tools');

//******************** Authからユーザが削除されたらUsersからも削除する ********************//
export const deleteUserBasedOnAuth = f.auth.user().onDelete(async (user) => {
    
  const path = `Users/${user.uid}`;
  try {
    await tools.firestore.delete(path, {
      project: process.env.GCLOUD_PROJECT,
      recursive: true,
      yes: true,
      token: functions.config().fb.token
    })
  } catch (err) {
    console.error(err)
  };
});

//******************** ユーザ名が変更されたら所属楽団のメンバー名を変更する ********************//
export const updateMemberNameWhenUserNameChanged = f.firestore.document('Users/{userID}').onUpdate((change, context) => {
  
  const userID = context.params.userID;
  const userName = change.after.data().UserName;

  //============================== 新規/更新/削除を判定 -> 更新の場合のみ継続 ==============================//
  const { before, after } = change;
  const status = writeStatus(before, after);
  if (status === 'create') {
    return;
  };
  if (status === 'update') {
    null;
  };
  if (status === 'delete') {
    return;
  };

  //============================== 所属楽団を取得 ==============================//
  const myGroupRef = db.collection('Users').doc(userID).collection('MyGroups').doc('MyGroupDocument');
  myGroupRef.get()
  .then((targetDoc) => {

    //------------------------------ ドキュメントが存在しない場合は終了 ------------------------------//
    if (!targetDoc.exists) { return; };
    //console.log('MyGroups gotten');

    //------------------------------ 所属楽団ごとにforEach ------------------------------//
    const userGroupList = new Map<string, any>(Object.entries(targetDoc.data()!));
    userGroupList.forEach((value: any, groupID: string) => {
      console.log(groupID);

      //---------- メンバー名を変更 ----------//
      const memberRef = db.collection('Groups').doc(groupID).collection('Members').doc('MemberDocument');
      const data = new MemberData(userID, userName);
      //console.log('data:', JSON.stringify(data));
      memberRef.set({[userID]: {...data}}, {merge: true});

    });
  })
  .catch((error) => {
    console.log('<ERROR> MyGroups: ', error);
  });
});

//****************************** 演奏者データ(名前のみ更新) ******************************//
class MemberData {
  MemberName = '';

  constructor(MemberID: string, MemberName: string) {
    this.MemberName = MemberName;
  };
};

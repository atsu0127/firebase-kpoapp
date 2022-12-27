import { f } from './index'
import { db } from './index'

//****************************** 下記は2023年度上期に実装予定です（コードは開発中です） ******************************//
//****************************** 楽団情報が更新されたら各ユーザの所属楽団情報を更新する ******************************//
export const syncGroup = f.firestore.document('Groups/{groupID}').onUpdate((change, context) => {
  
  const groupID = context.params.groupID; // 更新されたgroupID

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


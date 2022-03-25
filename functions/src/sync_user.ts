import * as functions from 'firebase-functions';
import { f } from './index';
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

//******************** ユーザ名が変更されたらメンバー名を変更する ********************//
//export const updateMamberNameWhenUserNameChanged = f.auth.user().onDelete(async (user) => {
//});

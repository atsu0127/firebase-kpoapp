import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
const f = functions.region('asia-northeast1');
const db = admin.firestore();
db.settings({
  ignoreUndefinedProperties: true,
});

//******************** Export ********************//
export { f };
export { db };
export * from './notification';
export * from './sync_attendance';
export * from './sync_performance';
export * from './sync_group';
export * from './sync_token';
export * from './sync_user';

//******************** onWriteの新規/更新/削除を判定する関数 ********************//
type DocData = admin.firestore.DocumentData;
type DocSnapshot<T = DocData> = admin.firestore.DocumentSnapshot<T>;
const writeStatus = (before: DocSnapshot, after: DocSnapshot) => {
  if (!before.exists) return 'create';
  if (!after.exists) return 'delete';
  return 'update';
};
export { writeStatus };
import * as firebase from '@firebase/testing';
import * as fs from 'fs';
import {
  usersRef,
  mygroupsRef,
  correctUser,
  correctMyGroup,
  groupsRef,
  correctGroup,
  authedApp,
  adminApp,
  authedUserName,
  invalidUserName,
  targetGroupName,
} from './lib/utils';

const rulesFilePath = 'firestore.rules';
const testName = 'firesbase-kpoapp-groups';

describe(testName, () => {
  // はじめに１度ルールを読み込ませる
  beforeAll(async () => {
    await firebase.loadFirestoreRules({
      projectId: testName,
      rules: fs.readFileSync(rulesFilePath, 'utf8'),
    });
  });

  // 開始前に毎回ユーザを作り所属グループも追加する
  beforeEach(async () => {
    const db = authedApp({ uid: authedUserName }, testName);
    const profile = usersRef(db).doc(authedUserName);
    const user = correctUser();
    await profile.set({ ...user });
    const usergroup = mygroupsRef(db, authedUserName).doc(targetGroupName);
    const group = correctMyGroup();
    await usergroup.set({ ...group });
  });

  // test毎にデータをクリアする
  afterEach(async () => {
    await firebase.clearFirestoreData({ projectId: testName });
  });

  // 全テスト終了後に作成したアプリを全消去
  afterAll(async () => {
    await Promise.all(firebase.apps().map((app) => app.delete()));
  });

  // Groupsのテスト
  describe('コレクションGroupsのテスト', () => {
    describe('read', () => {
      test('ログインしていないユーザはreadできない', async () => {
        const db = authedApp(null, testName);
        const groups = groupsRef(db).doc(targetGroupName);
        await firebase.assertFails(groups.get());
      });

      test('ログインしていればReadできる', async () => {
        const db = authedApp({ uid: authedUserName }, testName);
        const groups = groupsRef(db).doc(targetGroupName);
        await firebase.assertSucceeds(groups.get());
      });
    });

    describe('create', () => {
      test('作成はできない', async () => {
        const db = authedApp({ uid: authedUserName }, testName);
        const groupref = groupsRef(db).doc(targetGroupName);
        const group = correctGroup();
        await firebase.assertFails(groupref.set({ ...group }));
      });
    });

    describe('update', () => {
      // 開始前にgroupの情報作っておく
      beforeEach(async () => {
        const admin = adminApp(testName);
        const adminRef = groupsRef(admin).doc(targetGroupName);
        const group = correctGroup();
        await firebase.assertSucceeds(adminRef.set({ ...group }));
      });

      describe('成功例', () => {
        test('ログインいるユーザは自分が所属してるグループ情報なら更新できる', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = groupsRef(db).doc(targetGroupName);
          const group = correctGroup();
          group.GroupName = 'kpo2';
          await firebase.assertSucceeds(normalRef.set({ ...group }, { merge: true }));
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインいないユーザはグループ情報を更新できない', async () => {
          const anonymusUser = authedApp(null, testName);
          const anonymus = groupsRef(anonymusUser).doc(targetGroupName);
          const group = correctGroup();
          group.GroupName = 'kpo2';
          await firebase.assertFails(anonymus.set({ ...group }, { merge: true }));
        });

        test('ログインしててもユーザIDが違うと所属グループ情報を更新できない', async () => {
          const db = authedApp({ uid: invalidUserName }, testName);
          const normalRef = groupsRef(db).doc(targetGroupName);
          const group = correctGroup();
          group.GroupName = 'kpo2';
          await firebase.assertFails(normalRef.set({ ...group }, { merge: true }));
        });
      });

      describe('スキーマ検証で失敗', () => {
        test('スキーマ数が3個じゃないとだめ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = groupsRef(db).doc(targetGroupName);
          const group = correctGroup();

          // 少ない時は{merge: true}がないとだめ
          const { GroupName, ...restGroup } = group;
          await firebase.assertFails(normalRef.set({ ...restGroup }));

          // 多い場合は{merge: true}があってもだめ
          group.GroupName = 'kpo2';
          await firebase.assertFails(
            normalRef.set({ ...group, para1: 10, para2: 20 }, { merge: true })
          );
        });

        test('GroupNameがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = groupsRef(db).doc(targetGroupName);
          const group = correctGroup();
          group.GroupName = 111;
          await firebase.assertFails(normalRef.set({ ...group }, { merge: true }));
        });

        test('GroupNameEngがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = groupsRef(db).doc(targetGroupName);
          const group = correctGroup();
          group.GroupNameEng = 111;
          await firebase.assertFails(normalRef.set({ ...group }, { merge: true }));
        });

        test('GroupPasswordがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = groupsRef(db).doc(targetGroupName);
          const group = correctGroup();
          group.GroupPassword = 111;
          await firebase.assertFails(normalRef.set({ ...group }, { merge: true }));
        });
      });
    });

    describe('delete', () => {
      test('削除はできない', async () => {
        const admin = adminApp(testName);
        const adminRef = groupsRef(admin).doc(targetGroupName);
        const group = correctGroup();
        await firebase.assertSucceeds(adminRef.set({ ...group }));
        const authedUser = authedApp({ uid: authedUserName }, testName);
        const authed = groupsRef(authedUser).doc(targetGroupName);
        await firebase.assertFails(authed.delete());
      });
    });
  });
});

import * as firebase from '@firebase/testing';
import * as fs from 'fs';
import {
  usersRef,
  mygroupsRef,
  correctUser,
  correctMyGroup,
  authedApp,
  authedUserName,
  invalidUserName,
} from './lib/utils';

const rulesFilePath = 'firestore.rules';
const testName = 'firesbase-kpoapp-usergroups';

describe(testName, () => {
  // はじめに１度ルールを読み込ませる
  beforeAll(async () => {
    await firebase.loadFirestoreRules({
      projectId: testName,
      rules: fs.readFileSync(rulesFilePath, 'utf8'),
    });
  });

  // 開始前に毎回ユーザを作る
  beforeEach(async () => {
    const db = authedApp({ uid: authedUserName }, testName);
    const profile = usersRef(db).doc(authedUserName);
    const user = correctUser();
    await profile.set({ ...user });
  });

  // test毎にデータをクリアする
  afterEach(async () => {
    await firebase.clearFirestoreData({ projectId: testName });
  });

  // 全テスト終了後に作成したアプリを全消去
  afterAll(async () => {
    await Promise.all(firebase.apps().map((app) => app.delete()));
  });

  // UserGroupsのテスト
  describe('コレクションUserGroupsのテスト', () => {
    describe('read', () => {
      test('ログインしていないユーザはreadできない', async () => {
        const db = authedApp(null, testName);
        const usergroups = mygroupsRef(db, authedUserName).doc(invalidUserName);
        await firebase.assertFails(usergroups.get());
      });

      test('ログインしていても自分のではないものはreadできない', async () => {
        const db = authedApp({ uid: invalidUserName }, testName);
        const usergroups = mygroupsRef(db, authedUserName).doc(invalidUserName);
        await firebase.assertFails(usergroups.get());
      });

      test('ログインしていて自分のものはReadできる', async () => {
        const db = authedApp({ uid: authedUserName }, testName);
        const usergroups = mygroupsRef(db, authedUserName).doc(invalidUserName);
        await firebase.assertSucceeds(usergroups.get());
      });
    });

    describe('create', () => {
      describe('成功例', () => {
        test('ログインいるユーザは自分と同IDなら所属グループが作成できる', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const usergroups = mygroupsRef(db, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(usergroups.set({ ...group }));
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインしていないと所属グループが作成できない', async () => {
          const db = authedApp(null, testName);
          const usergroups = mygroupsRef(db, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertFails(usergroups.set({ ...group }));
        });

        test('ログインしていてもユーザIDが違うと作成できない', async () => {
          const db = authedApp({ uid: invalidUserName }, testName);
          const usergroups = mygroupsRef(db, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertFails(usergroups.set({ ...group }));
        });
      });

      describe('スキーマ検証で失敗', () => {
        test('パラメータ数が7個以外だとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const usergroups = mygroupsRef(db, authedUserName).doc(invalidUserName);
          // 6個の場合
          await firebase.assertFails(
            usergroups.set({
              groupName: 'gname',
              groupNameEng: 'gnameeng',
              joiningDate: firebase.firestore.FieldValue.serverTimestamp(),
              memberType: 'mtype',
              role: 'role',
              term: 'term',
            })
          );
          // 8個の場合
          await firebase.assertFails(
            usergroups.set({
              groupName: 'gname',
              groupNameEng: 'gnameeng',
              groupPassword: 'password',
              joiningDate: firebase.firestore.FieldValue.serverTimestamp(),
              memberType: 'mtype',
              role: 'role',
              term: 'term',
              term2: 'term2',
            })
          );
        });

        test('型の齟齬で失敗', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const usergroups = mygroupsRef(db, authedUserName).doc(invalidUserName);
          let group = correctMyGroup();

          // GroupNameはstring
          group.GroupName = 111;
          await firebase.assertFails(usergroups.set({ ...group }));

          // groupNameEngはstring
          group = correctMyGroup();
          group.GroupNameEng = 111;
          await firebase.assertFails(usergroups.set({ ...group }));

          // groupPasswordはstring
          group = correctMyGroup();
          group.GroupPassword = 111;
          await firebase.assertFails(usergroups.set({ ...group }));

          // joiningDateはtimestamp
          group = correctMyGroup();
          group.JoiningDate = Date();
          await firebase.assertFails(usergroups.set({ ...group }));

          // memberTypeはstring
          group = correctMyGroup();
          group.MemberType = 111;
          await firebase.assertFails(usergroups.set({ ...group }));

          // Roleはstring
          group = correctMyGroup();
          group.Role = 111;
          await firebase.assertFails(usergroups.set({ ...group }));

          // Termはstring
          group = correctMyGroup();
          group.Term = 111;
          await firebase.assertFails(usergroups.set({ ...group }));
        });
      });

      describe('データ検証で失敗', () => {
        test('joiningDateがサーバタイムスタンプと違うとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const usergroups = mygroupsRef(db, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          group.JoiningDate = firebase.firestore.Timestamp.now();
          await firebase.assertFails(usergroups.set({ ...group }));
        });
      });
    });

    describe('update', () => {
      describe('成功例', () => {
        test('ログインいるユーザは自分と同IDなら所属グループ情報が更新できる', async () => {
          const user1 = authedApp({ uid: authedUserName }, testName);
          const usergroups = mygroupsRef(user1, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(usergroups.set({ ...group }));
          const { JoiningDate, ...restGroup } = group;
          restGroup.GroupPassword = 'changed!!';
          await firebase.assertSucceeds(usergroups.set({ ...restGroup }, { merge: true }));
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインいないユーザは所属グループ情報を更新できない', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const anonymusUser = authedApp(null, testName);
          const anonymus = mygroupsRef(anonymusUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          const { JoiningDate, ...restGroup } = group;
          restGroup.GroupPassword = 'changed!!';
          await firebase.assertFails(anonymus.set({ ...restGroup }, { merge: true }));
        });

        test('ログインしててもユーザIDが違うと所属グループ情報を更新できない', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const anotherUser = authedApp({ uid: invalidUserName }, testName);
          const another = mygroupsRef(anotherUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          const { JoiningDate, ...restGroup } = group;
          restGroup.GroupPassword = 'changed!!';
          await firebase.assertFails(another.set({ ...restGroup }, { merge: true }));
        });
      });

      describe('スキーマ検証で失敗', () => {
        test('スキーマ数が6個じゃないとだめ', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));

          // 少ない時は{merge: true}がないとだめ
          const { JoiningDate, ...restGroup } = group;
          restGroup.GroupPassword = 'changed!!';
          await firebase.assertFails(authed.set({ ...restGroup }));

          // 多い場合は{merge: true}があってもだめ
          await firebase.assertFails(
            authed.set({ ...restGroup, para1: 10, para2: 20 }, { merge: true })
          );
        });

        test('GroupNameがstringじゃないとダメ', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          const { JoiningDate, ...restGroup } = group;
          restGroup.GroupName = 111;
          await firebase.assertFails(authed.set({ ...restGroup }, { merge: true }));
        });

        test('GroupNameEngがstringじゃないとダメ', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          const { JoiningDate, ...restGroup } = group;
          restGroup.GroupNameEng = 111;
          await firebase.assertFails(authed.set({ ...restGroup }, { merge: true }));
        });

        test('GroupPasswordがstringじゃないとダメ', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          const { JoiningDate, ...restGroup } = group;
          restGroup.GroupPassword = 111;
          await firebase.assertFails(authed.set({ ...restGroup }, { merge: true }));
        });

        test('JoiningDateがtimestampじゃないとダメ', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          group.JoiningDate = Date();
          await firebase.assertFails(authed.set({ ...group }, { merge: true }));
        });

        test('MemberTypeがstringじゃないとダメ', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          const { JoiningDate, ...restGroup } = group;
          restGroup.MemberType = 111;
          await firebase.assertFails(authed.set({ ...restGroup }, { merge: true }));
        });

        test('roleがstringじゃないとダメ', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          const { JoiningDate, ...restGroup } = group;
          restGroup.Role = 111;
          await firebase.assertFails(authed.set({ ...restGroup }, { merge: true }));
        });

        test('termがstringじゃないとダメ', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          const { JoiningDate, ...restGroup } = group;
          restGroup.Term = 111;
          await firebase.assertFails(authed.set({ ...restGroup }, { merge: true }));
        });
      });

      describe('データ検証で失敗', () => {
        test('JoiningDateが変更されているとダメ', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          group.JoiningDate = firebase.firestore.FieldValue.serverTimestamp();
          await firebase.assertFails(authed.set({ ...group }, { merge: true }));
        });
      });
    });

    describe('delete', () => {
      describe('成功例', () => {
        test('ログインいるユーザは自分と同IDなら所属団体情報を削除できる', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          await firebase.assertSucceeds(authed.delete());
        });
      });

      describe('失敗例', () => {
        test('ログインしてないと所属団体情報を削除できない', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const anonymusUser = authedApp(null, testName);
          const anonymus = mygroupsRef(anonymusUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          await firebase.assertFails(anonymus.delete());
        });

        test('ログインしていてもユーザIDが違うと所属団体情報を削除できない', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = mygroupsRef(authedUser, authedUserName).doc(invalidUserName);
          const anonymusUser = authedApp({ uid: invalidUserName }, testName);
          const anonymus = mygroupsRef(anonymusUser, authedUserName).doc(invalidUserName);
          const group = correctMyGroup();
          await firebase.assertSucceeds(authed.set({ ...group }));
          await firebase.assertFails(anonymus.delete());
        });
      });
    });
  });
});

import * as firebase from '@firebase/testing';
import * as fs from 'fs';
import {
  membersRef,
  correctMember,
  groupsRef,
  correctGroup,
  authedApp,
  adminApp,
  authedUserName,
  invalidUserName,
  targetGroupName,
  targetMemberName,
  memberUserName,
} from './lib/utils';

const rulesFilePath = 'firestore.rules';
const testName = 'firesbase-kpoapp-members';

describe(testName, () => {
  // はじめに１度ルールを読み込ませる
  beforeAll(async () => {
    await firebase.loadFirestoreRules({
      projectId: testName,
      rules: fs.readFileSync(rulesFilePath, 'utf8'),
    });
  });

  // 開始前に毎回ユーザを作り所属グループも追加する、グループも作っておく
  beforeEach(async () => {
    // const db = authedApp({ uid: authedUserName }, testName);
    // const profile = usersRef(db).doc(authedUserName);
    // const user = correctUser();
    // await profile.set({ ...user });
    // const usergroupRef = mygroupsRef(db, authedUserName).doc(targetGroupName);
    // const usergroup = correctMyGroup();
    // await usergroupRef.set({ ...usergroup });
    const admin = adminApp(testName);
    const groupRef = groupsRef(admin).doc(targetGroupName);
    const group = correctGroup();
    await groupRef.set({ ...group });
  });

  // test毎にデータをクリアする
  afterEach(async () => {
    await firebase.clearFirestoreData({ projectId: testName });
  });

  // 全テスト終了後に作成したアプリを全消去
  afterAll(async () => {
    await Promise.all(firebase.apps().map((app) => app.delete()));
  });

  // Memberssのテスト
  describe('コレクションMembersのテスト', () => {
    describe('read', () => {
      test('ログインしていないユーザはreadできない', async () => {
        const db = authedApp(null, testName);
        const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
        await firebase.assertFails(memberRef.get());
      });

      test('ログインしていればReadできる', async () => {
        const db = authedApp({ uid: authedUserName }, testName);
        const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
        await firebase.assertSucceeds(memberRef.get());
      });
    });

    describe('create', () => {
      describe('成功例', () => {
        test('ログインしていれば作成できる', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          await firebase.assertSucceeds(memberRef.set({ ...member }));
        });
      });

      describe('ログイン関係で失敗例', () => {
        test('ログインしてないとできない', async () => {
          const db = authedApp(null, testName);
          const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          await firebase.assertFails(memberRef.set({ ...member }));
        });
      });

      describe('スキーマ検証で失敗例', () => {
        test('パラメータ多くてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          await firebase.assertFails(memberRef.set({ ...member, param1: 'aaa' }));
        });

        test('MemberIDがstringじゃなくてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          member.MemberID = 1;
          await firebase.assertFails(memberRef.set({ ...member }));
        });

        test('MemberNameがstringじゃなくてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          member.MemberName = 1;
          await firebase.assertFails(memberRef.set({ ...member }));
        });

        test('MemberTypeがstringじゃなくてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          member.MemberType = 1;
          await firebase.assertFails(memberRef.set({ ...member }));
        });

        test('Termがstringじゃなくてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          member.Term = 1;
          await firebase.assertFails(memberRef.set({ ...member }));
        });

        test('Roleがstringじゃなくてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          member.Role = 1;
          await firebase.assertFails(memberRef.set({ ...member }));
        });

        test('JoiningDateがtimestampじゃなくてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          member.JoiningDate = '19700101';
          await firebase.assertFails(memberRef.set({ ...member }));
        });
      });

      describe('データ検証で失敗例', () => {
        test('作成時刻がserver timestampとずれててアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const memberRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          member.JoiningDate = Date();
          await firebase.assertFails(memberRef.set({ ...member }));
        });
      });
    });

    describe('update', () => {
      // 開始前にmemberの情報作っておく
      beforeEach(async () => {
        const admin = adminApp(testName);
        const adminRef = membersRef(admin, targetGroupName).doc(targetMemberName);
        const member = correctMember();
        await firebase.assertSucceeds(adminRef.set({ ...member }));

        // 二人目作っておく
        const adminRef2 = membersRef(admin, targetGroupName).doc(memberUserName);
        const member2 = correctMember();
        member2.MemberName = memberUserName;
        await firebase.assertSucceeds(adminRef2.set({ ...member2 }));
      });

      describe('成功例', () => {
        test('ログインいるユーザは自分が所属してるユーザ情報なら更新できる', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          const { JoiningDate, ...restMember } = member;
          restMember.MemberName = 'tomoatsu';
          await firebase.assertSucceeds(normalRef.set({ ...restMember }, { merge: true }));
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインしていないユーザはユーザ情報を更新できない', async () => {
          const anonymusUser = authedApp(null, testName);
          const anonymus = membersRef(anonymusUser, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          const { JoiningDate, ...restMember } = member;
          restMember.MemberName = 'tomoatsu';
          await firebase.assertFails(anonymus.set({ ...restMember }, { merge: true }));
        });

        test('ログインしててもグループにいないとユーザ情報を更新できない', async () => {
          const db = authedApp({ uid: invalidUserName }, testName);
          const normalRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          const { JoiningDate, ...restMember } = member;
          restMember.MemberName = 'tomoatsu';
          await firebase.assertFails(normalRef.set({ ...restMember }, { merge: true }));
        });

        test('ログインしててもグループにいても、自分自身じゃないとユーザ情報を更新できない', async () => {
          const db = authedApp({ uid: memberUserName }, testName);
          const normalRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          const { JoiningDate, ...restMember } = member;
          restMember.MemberName = 'tomoatsu';
          await firebase.assertFails(normalRef.set({ ...restMember }, { merge: true }));
        });
      });

      describe('スキーマ検証で失敗', () => {
        test('パラメータ多くてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();

          // 多い場合は{merge: true}があってもだめ
          const { JoiningDate, ...restMember } = member;
          restMember.MemberName = 'tomoatsu';
          await firebase.assertFails(
            normalRef.set({ ...restMember, para1: 10, para2: 20 }, { merge: true })
          );
        });

        test('MemberNameがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          const { JoiningDate, ...restMember } = member;
          restMember.MemberName = 111;
          await firebase.assertFails(normalRef.set({ ...restMember }, { merge: true }));
        });

        test('MemberTypeがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          const { JoiningDate, ...restMember } = member;
          restMember.MemberType = 111;
          await firebase.assertFails(normalRef.set({ ...restMember }, { merge: true }));
        });

        test('Termがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          const { JoiningDate, ...restMember } = member;
          restMember.Term = 111;
          await firebase.assertFails(normalRef.set({ ...restMember }, { merge: true }));
        });

        test('Roleがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          const { JoiningDate, ...restMember } = member;
          restMember.Role = 111;
          await firebase.assertFails(normalRef.set({ ...restMember }, { merge: true }));
        });
      });

      describe('データ検証で失敗', () => {
        test('MemberIDが変更されてたらだめ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = membersRef(db, targetGroupName).doc(targetMemberName);
          const member = correctMember();
          const { JoiningDate, ...restMember } = member;
          restMember.MemberID = `${restMember.MemberID}aaa`;
          await firebase.assertFails(normalRef.set({ ...restMember }, { merge: true }));
        });
      });
    });

    describe('delete', () => {
      // 開始前にmemberの情報作っておく
      beforeEach(async () => {
        const admin = adminApp(testName);
        const adminRef = membersRef(admin, targetGroupName).doc(targetMemberName);
        const member = correctMember();
        await firebase.assertSucceeds(adminRef.set({ ...member }));

        // 二人目作っておく
        const adminRef2 = membersRef(admin, targetGroupName).doc(memberUserName);
        const member2 = correctMember();
        member2.MemberName = memberUserName;
        await firebase.assertSucceeds(adminRef2.set({ ...member2 }));
      });

      describe('成功例', () => {
        test('所属しているグループのメンバーなら削除できる', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = membersRef(authedUser, targetGroupName).doc(targetMemberName);
          await firebase.assertSucceeds(authed.delete());
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインしていないとできない', async () => {
          const anonymusUser = authedApp(null, testName);
          const anonymus = membersRef(anonymusUser, targetGroupName).doc(targetMemberName);
          await firebase.assertFails(anonymus.delete());
        });

        test('ログインしていてもGroupに所属していないとできない', async () => {
          const anotherUser = authedApp({ uid: invalidUserName }, testName);
          const another = membersRef(anotherUser, targetGroupName).doc(targetMemberName);
          await firebase.assertFails(another.delete());
        });

        test('ログインしていてGroupに所属していても自分でないとできない', async () => {
          const memberUser = authedApp({ uid: memberUserName }, testName);
          const another = membersRef(memberUser, targetGroupName).doc(targetMemberName); // 自分ではないユーザを指定してる
          await firebase.assertFails(another.delete());
        });
      });
    });
  });
});

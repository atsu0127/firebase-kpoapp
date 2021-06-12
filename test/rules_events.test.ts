import * as firebase from '@firebase/testing';
import * as fs from 'fs';
import {
  usersRef,
  mygroupsRef,
  correctUser,
  correctMyGroup,
  groupsRef,
  correctGroup,
  correctEventWithFullParams,
  correctEventWithLeastParams,
  eventsRef,
  authedApp,
  adminApp,
  authedUserName,
  invalidUserName,
  targetGroupName,
  targetEventName,
  targetMemberName,
  membersRef,
  correctMember,
} from './lib/utils';

const rulesFilePath = 'firestore.rules';
const testName = 'firesbase-kpoapp-events';

describe(testName, () => {
  // はじめに１度ルールを読み込ませる
  beforeAll(async () => {
    await firebase.loadFirestoreRules({
      projectId: testName,
      rules: fs.readFileSync(rulesFilePath, 'utf8'),
    });
  });

  // 開始前に毎回ユーザを作り所属グループも追加する、グループも作っておきMemberにユーザを入れておく
  beforeEach(async () => {
    const db = authedApp({ uid: authedUserName }, testName);
    const profile = usersRef(db).doc(authedUserName);
    const user = correctUser();
    await profile.set({ ...user });
    const usergroupRef = mygroupsRef(db, authedUserName).doc(targetGroupName);
    const usergroup = correctMyGroup();
    await usergroupRef.set({ ...usergroup });
    const admin = adminApp(testName);
    const groupRef = groupsRef(admin).doc(targetGroupName);
    const group = correctGroup();
    await groupRef.set({ ...group });
    const memberRef = membersRef(admin, targetGroupName).doc(targetMemberName);
    const member = correctMember();
    await memberRef.set({ ...member });
  });

  // test毎にデータをクリアする
  afterEach(async () => {
    await firebase.clearFirestoreData({ projectId: testName });
  });

  // 全テスト終了後に作成したアプリを全消去
  afterAll(async () => {
    await Promise.all(firebase.apps().map((app) => app.delete()));
  });

  // Eventsのテスト
  describe('コレクションEventsのテスト', () => {
    describe('read', () => {
      test('ログインしていないユーザはreadできない', async () => {
        const db = authedApp(null, testName);
        const eventRef = eventsRef(db, targetGroupName).doc(targetEventName);
        await firebase.assertFails(eventRef.get());
      });

      test('ログインしていても所属していないユーザはreadできない', async () => {
        const db = authedApp({ uid: invalidUserName }, testName);
        const eventRef = eventsRef(db, targetGroupName).doc(targetEventName);
        await firebase.assertFails(eventRef.get());
      });

      test('ログインしてGroupに所属していればReadできる', async () => {
        const db = authedApp({ uid: authedUserName }, testName);
        const eventRef = eventsRef(db, targetGroupName).doc(targetEventName);
        await firebase.assertSucceeds(eventRef.get());
      });
    });

    describe('create', () => {
      describe('成功例', () => {
        test('最大限のパラメータで作成', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const eventRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();
          await firebase.assertSucceeds(eventRef.set({ ...event }));
        });

        test('最小限のパラメータで作成', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const eventRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithLeastParams();
          // ignoreUndefinedPropertiesが使えない(merge: trueもできない)のでこうなりました
          await firebase.assertSucceeds(
            eventRef.set(
              {
                EventName: event.EventName,
                EventType: event.EventType,
                FirstUpdatedByID: event.FirstUpdatedByID,
                FirstUpdatedByName: event.FirstUpdatedByName,
                FirstUpdatedOn: event.FirstUpdatedOn,
                LastUpdatedByID: event.LastUpdatedByID,
                LastUpdatedByName: event.LastUpdatedByName,
                LastUpdatedOn: event.LastUpdatedOn,
                OwnerID: event.OwnerID,
                OwnerName: event.OwnerName,
                TagAttendance: event.TagAttendance,
                TagCancel: event.TagCancel,
                TagImportance: event.TagImportance,
                TimestampEnd: event.TimestampEnd,
                TimestampStart: event.TimestampStart,
              },
              { merge: true }
            )
          );
        });
      });

      describe('ログイン関係で失敗例', () => {
        test('ログインしてないとできない', async () => {
          const db = authedApp(null, testName);
          const eventRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();
          await firebase.assertFails(eventRef.set({ ...event }));
        });

        test('ログインしててもユーザがGroupに所属していないとダメ', async () => {
          const db = authedApp({ uid: invalidUserName }, testName);
          const eventRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();
          await firebase.assertFails(eventRef.set({ ...event }));
        });
      });

      describe('スキーマ検証で失敗例', () => {
        test('パラメータ多くてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const eventRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();
          await firebase.assertFails(eventRef.set({ ...event, param1: 'aaa' }));
        });

        test('EventNameがstringじゃなくてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const eventRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();
          event.EventName = 111;
          await firebase.assertFails(eventRef.set({ ...event }));
        });
      });

      describe('データ検証で失敗例', () => {
        test('作成時刻がserver timestampとずれててアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const eventRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();
          event.FirstUpdatedOn = Date();
          await firebase.assertFails(eventRef.set({ ...event, param1: 'aaa' }));
        });
      });
    });

    describe('update', () => {
      // 開始前にeventの情報作っておく
      beforeEach(async () => {
        const admin = adminApp(testName);
        const adminRef = eventsRef(admin, targetGroupName).doc(targetEventName);
        const event = correctEventWithFullParams();
        await firebase.assertSucceeds(adminRef.set({ ...event }));
      });

      describe('成功例', () => {
        test('ログインいるユーザは自分が所属してるグループ情報なら更新できる', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();
          const { FirstUpdatedOn, ...restEvent } = event;
          restEvent.OwnerName = 'owner2';
          await firebase.assertSucceeds(normalRef.set({ ...restEvent }, { merge: true }));
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインいないユーザはグループ情報を更新できない', async () => {
          const anonymusUser = authedApp(null, testName);
          const anonymus = eventsRef(anonymusUser, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();
          const { FirstUpdatedOn, ...restEvent } = event;
          restEvent.OwnerName = 'owner2';
          await firebase.assertFails(anonymus.set({ ...restEvent }, { merge: true }));
        });

        test('ログインしててもユーザIDが違うと所属グループ情報を更新できない', async () => {
          const db = authedApp({ uid: invalidUserName }, testName);
          const normalRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();
          const { FirstUpdatedOn, ...restEvent } = event;
          restEvent.OwnerName = 'owner2';
          await firebase.assertFails(normalRef.set({ ...restEvent }, { merge: true }));
        });
      });

      describe('スキーマ検証で失敗', () => {
        test('パラメータ多くてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();

          // 多い場合は{merge: true}があってもだめ
          const { FirstUpdatedOn, ...restEvent } = event;
          restEvent.OwnerID = 'owner2';
          await firebase.assertFails(
            normalRef.set({ ...restEvent, para1: 10, para2: 20 }, { merge: true })
          );
        });

        test('EventNameがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = eventsRef(db, targetGroupName).doc(targetEventName);
          const event = correctEventWithFullParams();
          const { FirstUpdatedOn, ...restEvent } = event;
          restEvent.EventName = 111;
          await firebase.assertFails(normalRef.set({ ...restEvent }, { merge: true }));
        });
      });
    });

    describe('delete', () => {
      // 開始前にeventの情報作っておく
      beforeEach(async () => {
        const admin = adminApp(testName);
        const adminRef = eventsRef(admin, targetGroupName).doc(targetEventName);
        const event = correctEventWithFullParams();
        await firebase.assertSucceeds(adminRef.set({ ...event }));
      });

      describe('成功例', () => {
        test('所属しているグループなら削除できる', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = eventsRef(authedUser, targetGroupName).doc(targetEventName);
          await firebase.assertSucceeds(authed.delete());
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインしていないとできない', async () => {
          const anonymusUser = authedApp(null, testName);
          const anonymus = eventsRef(anonymusUser, targetGroupName).doc(targetEventName);
          await firebase.assertFails(anonymus.delete());
        });

        test('ログインしていてもGroupに所属していないとできない', async () => {
          const anotherUser = authedApp({ uid: invalidUserName }, testName);
          const another = eventsRef(anotherUser, targetGroupName).doc(targetEventName);
          await firebase.assertFails(another.delete());
        });
      });
    });
  });
});

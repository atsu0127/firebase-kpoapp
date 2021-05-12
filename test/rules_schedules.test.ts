import * as firebase from '@firebase/testing';
import * as fs from 'fs';
import {
  usersRef,
  usergroupsRef,
  correctUser,
  correctUserGroup,
  groupsRef,
  correctGroup,
  correctScheduleWithFullParams,
  correctScheduleWithLeastParams,
  schedulesRef,
  authedApp,
  adminApp,
  authedUserName,
  invalidUserName,
  targetGroupName,
  targetScheduleName,
} from './lib/utils';

const rulesFilePath = 'firestore.rules';
const testName = 'firesbase-kpoapp-schedules';

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
    const db = authedApp({ uid: authedUserName }, testName);
    const profile = usersRef(db).doc(authedUserName);
    const user = correctUser();
    await profile.set({ ...user });
    const usergroupRef = usergroupsRef(db, authedUserName).doc(targetGroupName);
    const usergroup = correctUserGroup();
    await usergroupRef.set({ ...usergroup });
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

  // Schedulesのテスト
  describe('コレクションSchedulesのテスト', () => {
    describe('read', () => {
      test('ログインしていないユーザはreadできない', async () => {
        const db = authedApp(null, testName);
        const scheduleRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
        await firebase.assertFails(scheduleRef.get());
      });

      test('ログインしていても所属していないユーザはreadできない', async () => {
        const db = authedApp({ uid: invalidUserName }, testName);
        const scheduleRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
        await firebase.assertFails(scheduleRef.get());
      });

      test('ログインしてGroupに所属していればReadできる', async () => {
        const db = authedApp({ uid: authedUserName }, testName);
        const scheduleRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
        await firebase.assertSucceeds(scheduleRef.get());
      });
    });

    describe('create', () => {
      describe('成功例', () => {
        test('最大限のパラメータで作成', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const scheduleRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();
          await firebase.assertSucceeds(scheduleRef.set({ ...schedule }));
        });

        test('最小限のパラメータで作成', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const scheduleRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithLeastParams();
          // ignoreUndefinedPropertiesが使えない(merge: trueもできない)のでこうなりました
          await firebase.assertSucceeds(
            scheduleRef.set(
              {
                EventName: schedule.EventName,
                EventType: schedule.EventType,
                FirstUpdatedByID: schedule.FirstUpdatedByID,
                FirstUpdatedByName: schedule.FirstUpdatedByName,
                FirstUpdatedOn: schedule.FirstUpdatedOn,
                LastUpdatedByID: schedule.LastUpdatedByID,
                LastUpdatedByName: schedule.LastUpdatedByName,
                LastUpdatedOn: schedule.LastUpdatedOn,
                OwnerID: schedule.OwnerID,
                OwnerName: schedule.OwnerName,
                TagAttendance: schedule.TagAttendance,
                TagCancel: schedule.TagCancel,
                TagShare: schedule.TagShare,
                TimestampEnd: schedule.TimestampEnd,
                TimestampStart: schedule.TimestampStart,
              },
              { merge: true }
            )
          );
        });
      });

      describe('ログイン関係で失敗例', () => {
        test('ログインしてないとできない', async () => {
          const db = authedApp(null, testName);
          const scheduleRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();
          await firebase.assertFails(scheduleRef.set({ ...schedule }));
        });

        test('ログインしててもユーザがGroupに所属していないとダメ', async () => {
          const db = authedApp({ uid: invalidUserName }, testName);
          const scheduleRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();
          await firebase.assertFails(scheduleRef.set({ ...schedule }));
        });
      });

      describe('スキーマ検証で失敗例', () => {
        test('パラメータ多くてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const scheduleRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();
          await firebase.assertFails(scheduleRef.set({ ...schedule, param1: 'aaa' }));
        });

        test('EventNameがstringじゃなくてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const scheduleRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();
          schedule.EventName = 111;
          await firebase.assertFails(scheduleRef.set({ ...schedule }));
        });
      });

      describe('データ検証で失敗例', () => {
        test('作成時刻がserver timestampとずれててアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const scheduleRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();
          schedule.FirstUpdatedOn = Date();
          await firebase.assertFails(scheduleRef.set({ ...schedule, param1: 'aaa' }));
        });
      });
    });

    describe('update', () => {
      // 開始前にscheduleの情報作っておく
      beforeEach(async () => {
        const admin = adminApp(testName);
        const adminRef = schedulesRef(admin, targetGroupName).doc(targetScheduleName);
        const schedule = correctScheduleWithFullParams();
        await firebase.assertSucceeds(adminRef.set({ ...schedule }));
      });

      describe('成功例', () => {
        test('ログインいるユーザは自分が所属してるグループ情報なら更新できる', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();
          const { FirstUpdatedOn, ...restSchedule } = schedule;
          restSchedule.OwnerName = 'owner2';
          await firebase.assertSucceeds(normalRef.set({ ...restSchedule }, { merge: true }));
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインいないユーザはグループ情報を更新できない', async () => {
          const anonymusUser = authedApp(null, testName);
          const anonymus = schedulesRef(anonymusUser, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();
          const { FirstUpdatedOn, ...restSchedule } = schedule;
          restSchedule.OwnerName = 'owner2';
          await firebase.assertFails(anonymus.set({ ...restSchedule }, { merge: true }));
        });

        test('ログインしててもユーザIDが違うと所属グループ情報を更新できない', async () => {
          const db = authedApp({ uid: invalidUserName }, testName);
          const normalRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();
          const { FirstUpdatedOn, ...restSchedule } = schedule;
          restSchedule.OwnerName = 'owner2';
          await firebase.assertFails(normalRef.set({ ...restSchedule }, { merge: true }));
        });
      });

      describe('スキーマ検証で失敗', () => {
        test('パラメータ多くてアウト', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();

          // 多い場合は{merge: true}があってもだめ
          const { FirstUpdatedOn, ...restSchedule } = schedule;
          restSchedule.OwnerID = 'owner2';
          await firebase.assertFails(
            normalRef.set({ ...restSchedule, para1: 10, para2: 20 }, { merge: true })
          );
        });

        test('EventNameがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: authedUserName }, testName);
          const normalRef = schedulesRef(db, targetGroupName).doc(targetScheduleName);
          const schedule = correctScheduleWithFullParams();
          const { FirstUpdatedOn, ...restSchedule } = schedule;
          restSchedule.EventName = 111;
          await firebase.assertFails(normalRef.set({ ...restSchedule }, { merge: true }));
        });
      });
    });

    describe('delete', () => {
      // 開始前にscheduleの情報作っておく
      beforeEach(async () => {
        const admin = adminApp(testName);
        const adminRef = schedulesRef(admin, targetGroupName).doc(targetScheduleName);
        const schedule = correctScheduleWithFullParams();
        await firebase.assertSucceeds(adminRef.set({ ...schedule }));
      });

      describe('成功例', () => {
        test('所属しているグループなら削除できる', async () => {
          const authedUser = authedApp({ uid: authedUserName }, testName);
          const authed = schedulesRef(authedUser, targetGroupName).doc(targetScheduleName);
          await firebase.assertSucceeds(authed.delete());
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインしていないとできない', async () => {
          const anonymusUser = authedApp(null, testName);
          const anonymus = schedulesRef(anonymusUser, targetGroupName).doc(targetScheduleName);
          await firebase.assertFails(anonymus.delete());
        });

        test('ログインしていてもGroupに所属していないとできない', async () => {
          const anotherUser = authedApp({ uid: invalidUserName }, testName);
          const another = schedulesRef(anotherUser, targetGroupName).doc(targetScheduleName);
          await firebase.assertFails(another.delete());
        });
      });
    });
  });
});

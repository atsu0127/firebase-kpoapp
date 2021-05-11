import * as firebase from '@firebase/testing';
import * as fs from 'fs';
import { usersRef, correctUser, authedApp } from './lib/utils';

const rulesFilePath = 'firestore.rules';
const testName = 'firesbase-kpoapp-users';

describe(testName, () => {
  // はじめに１度ルールを読み込ませる
  beforeAll(async () => {
    await firebase.loadFirestoreRules({
      projectId: testName,
      rules: fs.readFileSync(rulesFilePath, 'utf8'),
    });
  });

  // test毎にデータをクリアする
  afterEach(async () => {
    await firebase.clearFirestoreData({ projectId: testName });
  });

  // 全テスト終了後に作成したアプリを全消去
  afterAll(async () => {
    await Promise.all(firebase.apps().map((app) => app.delete()));
  });

  // Usersのテスト
  describe('コレクションUsersのテスト', () => {
    describe('read', () => {
      test('ログインしていないユーザはreadできない', async () => {
        const db = authedApp(null, testName);
        const user = usersRef(db).doc('atsutomo');
        await firebase.assertFails(user.get());
      });

      test('ログインしていても自分のではないものはreadできない', async () => {
        const db = authedApp({ uid: 'tabata' }, testName);
        const user = usersRef(db).doc('atsutomo');
        await firebase.assertFails(user.get());
      });

      test('ログインしていて自分のものはReadできる', async () => {
        const db = authedApp({ uid: 'atsutomo' }, testName);
        const user = usersRef(db).doc('atsutomo');
        await firebase.assertSucceeds(user.get());
      });
    });

    describe('create', () => {
      describe('成功例', () => {
        test('ログインいるユーザは自分と同IDならユーザが作成できる', async () => {
          const db = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(profile.set({ ...user }));
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインしていないとユーザが作成できない', async () => {
          const db = authedApp(null, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          await firebase.assertFails(profile.set({ ...user }));
        });

        test('ログインしていてもユーザIDが違うと作成できない', async () => {
          const db = authedApp({ uid: 'tabata' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          await firebase.assertFails(profile.set({ ...user }));
        });
      });

      describe('スキーマ検証で失敗', () => {
        test('パラメータ数が5個以外だとダメ', async () => {
          const db = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          // 6個の場合
          await firebase.assertFails(
            profile.set({
              Agreement: true,
              Agreement2: true,
              AgreementDate: firebase.firestore.Timestamp.now(),
              AuthStyle: 'Email&Password',
              RegistrationDate: firebase.firestore.FieldValue.serverTimestamp(),
              UserName: 'atsutomo',
            })
          );
          // 4個の場合
          await firebase.assertFails(
            profile.set({
              AgreementDate: firebase.firestore.Timestamp.now(),
              AuthStyle: 'Email&Password',
              RegistrationDate: firebase.firestore.FieldValue.serverTimestamp(),
              UserName: 'atsutomo',
            })
          );
        });

        test('Agreementがboolじゃないとダメ', async () => {
          const db = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          user.Agreement = 1;
          await firebase.assertFails(profile.set({ ...user }));
        });

        test('AgreementDateがtimestampじゃないとダメ', async () => {
          const db = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          user.AgreementDate = Date();
          await firebase.assertFails(profile.set({ ...user }));
        });

        test('AuthStyleがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          user.AuthStyle = 1;
          await firebase.assertFails(profile.set({ ...user }));
        });

        test('RegistrationDateがtimestampじゃないとダメ', async () => {
          const db = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          user.RegistrationDate = Date();
          await firebase.assertFails(profile.set({ ...user }));
        });

        test('UserNameがstringじゃないとダメ', async () => {
          const db = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          user.UserName = 1;
          await firebase.assertFails(profile.set({ ...user }));
        });
      });

      describe('データ検証で失敗', () => {
        test('Agreementがfalseだとダメ', async () => {
          const db = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          user.Agreement = false;
          await firebase.assertFails(profile.set({ ...user }));
        });

        test('AgreementDateがサーバタイムスタンプと同じだとダメ', async () => {
          const db = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          user.AgreementDate = firebase.firestore.FieldValue.serverTimestamp();
          await firebase.assertFails(profile.set({ ...user }));
        });

        test('RegistrationDateがサーバタイムスタンプと違うとダメ', async () => {
          const db = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(db).doc('atsutomo');
          const user = correctUser();
          user.RegistrationDate = firebase.firestore.Timestamp.now();
          await firebase.assertFails(profile.set({ ...user }));
        });
      });
    });

    describe('update', () => {
      describe('成功例', () => {
        test('ログインいるユーザは自分と同IDならユーザ情報が更新できる', async () => {
          const user1 = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(user1).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(profile.set({ ...user }));
          const { RegistrationDate, ...restUser } = user;
          restUser.UserName = 'mototsua';
          await firebase.assertSucceeds(profile.set({ ...restUser }, { merge: true }));
        });
      });

      describe('ログイン関係で失敗', () => {
        test('ログインしていないユーザは更新できない', async () => {
          const authedUser = authedApp({ uid: 'atsutomo' }, testName);
          const authed = usersRef(authedUser).doc('atsutomo');
          const anonymusUser = authedApp(null, testName);
          const anonymus = usersRef(anonymusUser).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(authed.set({ ...user }));
          const { RegistrationDate, ...restUser } = user;
          restUser.UserName = 'mototsua';
          await firebase.assertFails(anonymus.set({ ...restUser }, { merge: true }));
        });

        test('ログインしててもユーザIDが違うと更新できない', async () => {
          const authedUser = authedApp({ uid: 'atsutomo' }, testName);
          const authed = usersRef(authedUser).doc('atsutomo');
          const anotherUser = authedApp({ uid: 'tabata' }, testName);
          const another = usersRef(anotherUser).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(authed.set({ ...user }));
          const { RegistrationDate, ...restUser } = user;
          restUser.UserName = 'mototsua';
          await firebase.assertFails(another.set({ ...restUser }, { merge: true }));
        });
      });

      describe('スキーマ検証で失敗', () => {
        test('スキーマ数が5個じゃないとだめ', async () => {
          const authedUser = authedApp({ uid: 'atsutomo' }, testName);
          const authed = usersRef(authedUser).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(authed.set({ ...user }));

          // 少ない時は{merge: true}がないとだめ
          const { RegistrationDate, ...restUser } = user;
          restUser.UserName = 'mototsua';
          await firebase.assertFails(authed.set({ ...restUser }));

          // 多い場合は{merge: true}があってもだめ
          await firebase.assertFails(
            authed.set({ ...restUser, para1: 10, para2: 20 }, { merge: true })
          );
        });

        test('Agreementがboolじゃないとだめ', async () => {
          const authedUser = authedApp({ uid: 'atsutomo' }, testName);
          const authed = usersRef(authedUser).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(authed.set({ ...user }));
          const { RegistrationDate, ...restUser } = user;
          restUser.Agreement = 1;
          await firebase.assertFails(authed.set({ ...restUser }, { merge: true }));
        });

        test('AgreementDateがtimestampじゃないとだめ', async () => {
          const authedUser = authedApp({ uid: 'atsutomo' }, testName);
          const authed = usersRef(authedUser).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(authed.set({ ...user }));
          const { RegistrationDate, ...restUser } = user;
          restUser.AgreementDate = Date();
          await firebase.assertFails(authed.set({ ...restUser }, { merge: true }));
        });

        test('AuthStyleがstringじゃないとだめ', async () => {
          const authedUser = authedApp({ uid: 'atsutomo' }, testName);
          const authed = usersRef(authedUser).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(authed.set({ ...user }));
          const { RegistrationDate, ...restUser } = user;
          restUser.AuthStyle = 1;
          await firebase.assertFails(authed.set({ ...restUser }, { merge: true }));
        });

        test('RegistrationDateがtimestampじゃないとだめ', async () => {
          const authedUser = authedApp({ uid: 'atsutomo' }, testName);
          const authed = usersRef(authedUser).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(authed.set({ ...user }));
          user.RegistrationDate = Date();
          await firebase.assertFails(authed.set({ ...user }, { merge: true }));
        });

        test('UserNameがstringじゃないとだめ', async () => {
          const authedUser = authedApp({ uid: 'atsutomo' }, testName);
          const authed = usersRef(authedUser).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(authed.set({ ...user }));
          const { RegistrationDate, ...restUser } = user;
          restUser.UserName = 1;
          await firebase.assertFails(authed.set({ ...restUser }, { merge: true }));
        });
      });

      describe('データ検証で失敗', () => {
        test('Agreementがfalseだとダメ', async () => {
          const user1 = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(user1).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(profile.set({ ...user }));
          const { RegistrationDate, ...restUser } = user;
          restUser.Agreement = false;
          await firebase.assertFails(profile.set({ ...restUser }, { merge: true }));
        });

        test('AgreementDateがサーバタイムスタンプと同じだとダメ', async () => {
          const user1 = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(user1).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(profile.set({ ...user }));
          const { RegistrationDate, ...restUser } = user;
          restUser.AgreementDate = firebase.firestore.FieldValue.serverTimestamp();
          await firebase.assertFails(profile.set({ ...restUser }, { merge: true }));
        });

        test('RegistrationDateが変更されているとダメ', async () => {
          const user1 = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(user1).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(profile.set({ ...user }));
          user.RegistrationDate = firebase.firestore.FieldValue.serverTimestamp();
          await firebase.assertFails(profile.set({ ...user }, { merge: true }));
        });
      });
    });

    describe('delete', () => {
      describe('成功例', () => {
        test('ログインいるユーザは自分と同IDならユーザ情報を削除できる', async () => {
          const user1 = authedApp({ uid: 'atsutomo' }, testName);
          const profile = usersRef(user1).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(profile.set({ ...user }));
          await firebase.assertSucceeds(profile.delete());
        });
      });

      describe('失敗例', () => {
        test('ログインしてないとユーザ情報削除できない', async () => {
          const authedUser = authedApp({ uid: 'atsutomo' }, testName);
          const authed = usersRef(authedUser).doc('atsutomo');
          const anonymusUser = authedApp(null, testName);
          const anonymus = usersRef(anonymusUser).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(authed.set({ ...user }));
          await firebase.assertFails(anonymus.delete());
        });

        test('ログインしていてもユーザIDが違うと削除できない', async () => {
          const authedUser = authedApp({ uid: 'atsutomo' }, testName);
          const authed = usersRef(authedUser).doc('atsutomo');
          const anotherUser = authedApp({ uid: 'tabata' }, testName);
          const another = usersRef(anotherUser).doc('atsutomo');
          const user = correctUser();
          await firebase.assertSucceeds(authed.set({ ...user }));
          await firebase.assertFails(another.delete());
        });
      });
    });
  });
});

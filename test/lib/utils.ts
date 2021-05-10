import * as firebase from '@firebase/testing';

function usersRef(db: firebase.firestore.Firestore): firebase.firestore.CollectionReference {
  return db.collection('Users');
}

function usergroupsRef(db: firebase.firestore.Firestore, userName: string): firebase.firestore.CollectionReference {
  return db.collection(`Users/${userName}/Groups`);
}

// テスト用のクラス、誤った値を入れられるように型を少し実際とは変えています
class User {
  UserName: string | number;
  Agreement: boolean | number;
  AgreementDate: firebase.firestore.Timestamp | firebase.firestore.FieldValue | string;
  AuthStyle: string | number;
  RegistrationDate: firebase.firestore.Timestamp | firebase.firestore.FieldValue | string;

  constructor(
    username: string,
    agreement: boolean,
    agreementDate: firebase.firestore.Timestamp,
    authStyle: string,
    registrationDate: firebase.firestore.FieldValue
  ) {
    this.UserName = username;
    this.Agreement = agreement;
    this.AgreementDate = agreementDate;
    this.AuthStyle = authStyle;
    this.RegistrationDate = registrationDate;
  }
}

function correctUser(): User {
  return new User(
    'atsutomo',
    true,
    firebase.firestore.Timestamp.now(),
    'Email&Password',
    firebase.firestore.FieldValue.serverTimestamp()
  );
}

class UserGroup {
  GroupName: string | number;
  GroupNameEng: string | number;
  GroupPassword: string | number;
  JoiningDate: firebase.firestore.Timestamp | firebase.firestore.FieldValue | string;
  MemberType: string | number;
  Role: string | number;
  Term: string | number;

  constructor(
    groupName: string,
    groupNameEng: string,
    groupPassword: string,
    joiningDate: firebase.firestore.FieldValue,
    memberType: string,
    role: string,
    term: string
  ) {
    this.GroupName = groupName;
    this.GroupNameEng = groupNameEng;
    this.GroupPassword = groupPassword;
    this.JoiningDate = joiningDate;
    this.MemberType = memberType;
    this.Role = role;
    this.Term = term;
  }
}

function correctUserGroup(): UserGroup {
  return new UserGroup(
    'Kオケ',
    'kpo',
    '12345678',
    firebase.firestore.FieldValue.serverTimestamp(),
    'メンバータイプ',
    'ロール',
    '1期生'
  );
}

class AuthUser {
  uid: string;

  constructor(uid: string) {
    this.uid = uid;
  }
}

function authedApp(auth: AuthUser, projectId: string): firebase.firestore.Firestore {
  return firebase.initializeTestApp({ projectId: projectId, auth: auth }).firestore();
}

// function adminApp(): firebase.firestore.Firestore {
//   return firebase.initializeAdminApp({ projectId: testName }).firestore();
// }

export {
  usersRef,
  usergroupsRef,
  correctUser,
  correctUserGroup,
  authedApp
}
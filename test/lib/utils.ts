import * as firebase from '@firebase/testing';

const authedUserName = 'atsutomo';
const invalidUserName = 'tabata';
const targetGroupName = 'kpo';
const targetScheduleName = 'schedule';

function usersRef(db: firebase.firestore.Firestore): firebase.firestore.CollectionReference {
  return db.collection('Users');
}

function usergroupsRef(db: firebase.firestore.Firestore, userName: string): firebase.firestore.CollectionReference {
  return db.collection(`Users/${userName}/Groups`);
}

function groupsRef(db: firebase.firestore.Firestore): firebase.firestore.CollectionReference {
  return db.collection(`Groups`);
}

function schedulesRef(db: firebase.firestore.Firestore, groupID: string): firebase.firestore.CollectionReference {
  return db.collection(`Groups/${groupID}/Schedules`);
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

class Group {
  GroupName: string | number;
  GroupNameEng: string | number;
  GroupPassword: string | number;

  constructor(
    groupName: string,
    groupNameEng: string,
    groupPassword: string
  ) {
    this.GroupName = groupName;
    this.GroupNameEng = groupNameEng;
    this.GroupPassword = groupPassword;
  }
}

function correctGroup(): Group {
  return new Group(
    'kpo',
    'kpo',
    '12345678'
  );
}

class Schedule {
  constructor (
    public EventName: string | number = "event1",
    public EventType: string = "type1",
    public FirstUpdatedByID: string = "user1",
    public FirstUpdatedByName: string = "user1",
    public FirstUpdatedOn: firebase.firestore.FieldValue = firebase.firestore.FieldValue.serverTimestamp(),
    public LastUpdatedByID: string = "user2",
    public LastUpdatedByName: string = "user2",
    public LastUpdatedOn: firebase.firestore.FieldValue = firebase.firestore.FieldValue.serverTimestamp(),
    public OwnerID: string = "group1",
    public OwnerName: string = "group1",
    public TagAttendance: boolean = false,
    public TagCancel: boolean = false,
    public TagShare: boolean = false,
    public TimestampEnd: firebase.firestore.Timestamp = firebase.firestore.Timestamp.now(),
    public TimestampStart: firebase.firestore.Timestamp = firebase.firestore.Timestamp.now(),
    public EventTypeDetail?: string,
    public Memo?: string,
    public Notice?: string,
    public Place?: string,
    public PlaceDetail?: string,
    public PlaceName?: string,
    public Timetable?: string
  ) {}
}

function correctScheduleWithLeastParams(): Schedule {
  return new Schedule();
}

function correctScheduleWithFullParams(): Schedule {
  const schedule = new Schedule();
  schedule.EventTypeDetail = "eventTypeDetail";
  schedule.Memo = "memo";
  schedule.Notice = "notice";
  schedule.Place = "place";
  schedule.PlaceDetail = "placeDetail";
  schedule.PlaceName = "PlaceName";
  schedule.Timetable = "timeTable";
  return schedule;
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

function adminApp(projectId: string): firebase.firestore.Firestore {
  return firebase.initializeAdminApp({ projectId: projectId }).firestore();
}

export {
  usersRef,
  usergroupsRef,
  groupsRef,
  schedulesRef,
  correctUser,
  correctUserGroup,
  correctGroup,
  correctScheduleWithLeastParams,
  correctScheduleWithFullParams,
  authedApp,
  adminApp,
  authedUserName,
  invalidUserName,
  targetGroupName,
  targetScheduleName
}
import * as firebase from '@firebase/testing';

const authedUserName = 'atsutomo';
const invalidUserName = 'tabata';
const memberUserName = 'hoge';
const targetGroupName = 'kpo';
const targetMemberName = authedUserName;
const targetEventName = 'event';

function usersRef(db: firebase.firestore.Firestore): firebase.firestore.CollectionReference {
  return db.collection('Users');
}

function mygroupsRef(
  db: firebase.firestore.Firestore,
  userName: string
): firebase.firestore.CollectionReference {
  return db.collection(`Users/${userName}/MyGroups`);
}

function groupsRef(db: firebase.firestore.Firestore): firebase.firestore.CollectionReference {
  return db.collection(`Groups`);
}

function membersRef(
  db: firebase.firestore.Firestore,
  groupID: string
): firebase.firestore.CollectionReference {
  return db.collection(`Groups/${groupID}/Members`);
}

function eventsRef(
  db: firebase.firestore.Firestore,
  groupID: string
): firebase.firestore.CollectionReference {
  return db.collection(`Groups/${groupID}/Events`);
}

// テスト用のクラス、誤った値を入れられるように型を少し実際とは変えています
class User {
  constructor(
    public Agreement: boolean | number = true,
    public AgreementDate:
      | firebase.firestore.Timestamp
      | firebase.firestore.FieldValue
      | string = firebase.firestore.Timestamp.now(),
    public AuthStyle: string | number = 'Email&Password',
    public RegistrationDate:
      | firebase.firestore.Timestamp
      | firebase.firestore.FieldValue
      | string = firebase.firestore.FieldValue.serverTimestamp()
  ) {}
}

function correctUser(): User {
  return new User();
}

class MyGroup {
  constructor(
    public GroupName: string | number = targetGroupName,
    public GroupNameEng: string | number = targetGroupName,
    public GroupPassword: string | number = '12345678',
    public JoiningDate:
      | firebase.firestore.Timestamp
      | firebase.firestore.FieldValue
      | string = firebase.firestore.FieldValue.serverTimestamp(),
    public MemberType: string | number = 'メンバータイプ',
    public Role: string | number = 'ロール',
    public Term: string | number = '1期生'
  ) {}
}

function correctMyGroup(): MyGroup {
  return new MyGroup();
}

class Group {
  constructor(
    public GroupName: string | number = targetGroupName,
    public GroupNameEng: string | number = targetGroupName,
    public GroupPassword: string | number = '12345678'
  ) {}
}

function correctGroup(): Group {
  return new Group();
}

class Member {
  constructor(
    public MemberName: string | number = targetMemberName,
    public MemberType: string | number = '正団員',
    public Role: string | number = '',
    public Term: string | number = '8期',
    public JoiningDate:
      | firebase.firestore.FieldValue
      | string = firebase.firestore.FieldValue.serverTimestamp()
  ) {}
}

function correctMember(): Member {
  return new Member();
}

class Event {
  constructor(
    public EventName: string | number = 'event1',
    public EventType: string = 'type1',
    public FirstUpdatedByID: string = 'user1',
    public FirstUpdatedByName: string = 'user1',
    public FirstUpdatedOn:
      | firebase.firestore.FieldValue
      | string = firebase.firestore.FieldValue.serverTimestamp(),
    public LastUpdatedByID: string = 'user2',
    public LastUpdatedByName: string = 'user2',
    public LastUpdatedOn:
      | firebase.firestore.FieldValue
      | string = firebase.firestore.FieldValue.serverTimestamp(),
    public OwnerID: string = 'group1',
    public OwnerName: string = 'group1',
    public TagAttendance: boolean = false,
    public TagCancel: boolean = false,
    public TagImportance: boolean = false,
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

function correctEventWithLeastParams(): Event {
  return new Event();
}

function correctEventWithFullParams(): Event {
  const event = new Event();
  event.EventTypeDetail = 'eventTypeDetail';
  event.Memo = 'memo';
  event.Notice = 'notice';
  event.Place = 'place';
  event.PlaceDetail = 'placeDetail';
  event.PlaceName = 'PlaceName';
  event.Timetable = 'timeTable';
  return event;
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
  mygroupsRef,
  groupsRef,
  membersRef,
  eventsRef,
  correctUser,
  correctMyGroup,
  correctGroup,
  correctMember,
  correctEventWithLeastParams,
  correctEventWithFullParams,
  authedApp,
  adminApp,
  authedUserName,
  invalidUserName,
  targetGroupName,
  targetMemberName,
  targetEventName,
  memberUserName,
};

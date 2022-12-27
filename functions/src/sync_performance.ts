import { f } from './index'
import { db } from './index'
import { writeStatus } from './index'

//****************************** MyPerformanceが更新されたらPerformerDocumentを更新する ******************************//
export const syncPerformance = f.firestore.document('Users/{userID}/MyPerformance/{groupID}').onWrite(async (change, context) => {

  const userID = context.params.userID;
  const groupID = context.params.groupID;

  //============================== 新規/更新/削除を判定(単一ドキュメントなので原則「Update」になる) ==============================//
  const { before, after } = change;
  const status = writeStatus(before, after);
  let oldPerformance = new Map<string, PerformanceData>();
  let newPerformance = new Map<string, PerformanceData>();
  if (status === 'create') {
    newPerformance = new Map<string, PerformanceData>(Object.entries(change.after.data()!));
  };
  if (status === 'update') {
    oldPerformance = new Map<string, PerformanceData>(Object.entries(change.before.data()!));
    newPerformance = new Map<string, PerformanceData>(Object.entries(change.after.data()!));
  };
  if (status === 'delete') {
    return;
  };
  //console.log('newPerformance:', JSON.stringify([...newPerformance]));

  //============================== MyPerformance(New)を曲ごとに分割 ==============================//
  for (const [_, performance] of newPerformance) {
    //console.log('Performance:', JSON.stringify(Performance));
    const programID = performance.ProgramID;

    //------------------------------ 曲が変更前後両方に存在する場合 ------------------------------//
    if (oldPerformance.has(programID)) {
      const old: PerformanceData = oldPerformance.get(programID)!;
      //console.log('old:', JSON.stringify(old));

      //~~~~~~~~~~ 乗り番内容に変更のない曲は更新しない ~~~~~~~~~~//
      if (performance.MyPerformanceType === old.MyPerformanceType && performance.MyPerformanceIsPartLeader === old.MyPerformanceIsPartLeader
        && performance.MyPerformanceIsSectionLeader === old.MyPerformanceIsSectionLeader && performance.MyPerformancePart === old.MyPerformancePart
        && performance.MyPerformancePartDetail === old.MyPerformancePartDetail) {
        //console.log('SAME');
        continue;
      };
    };

    //------------------------------ 更新 ------------------------------//
    console.log('UPDATE: Perfomers of ', programID);
    const eventRef = db.collection('Groups').doc(groupID).collection('Programs').doc(programID).collection('Performers').doc('PerformerDocument');
    const data = new PerformerData(userID, performance.MyPerformanceType, performance.MyPerformanceIsPartLeader, performance.MyPerformanceIsSectionLeader,
      performance.MyPerformancePart, performance.MyPerformancePartDetail);
    //console.log('data:', JSON.stringify(data));
    await eventRef.set({[userID]: {...data}}, {merge: true});
  };
});

//****************************** 自分の乗り番データ ******************************//
class PerformanceData {
  ProgramID = '';
  MyPerformanceType = false;
  MyPerformanceIsPartLeader = false;
  MyPerformanceIsSectionLeader = false;
  MyPerformancePart = '';
  MyPerformancePartDetail = '';

  constructor(ProgramID: string, MyPerformanceType: boolean, MyPerformanceIsPartLeader: boolean, MyPerformanceIsSectionLeader: boolean,
    MyPerformancePart: string, MyPerformancePartDetail: string) {
    this.ProgramID = ProgramID;
    this.MyPerformanceType = MyPerformanceType;
    this.MyPerformanceIsPartLeader = MyPerformanceIsPartLeader;
    this.MyPerformanceIsSectionLeader = MyPerformanceIsSectionLeader;
    this.MyPerformancePart = MyPerformancePart;
    this.MyPerformancePartDetail = MyPerformancePartDetail;
  };
};

//****************************** 演奏者データ ******************************//
class PerformerData {
  PerformerID = '';
  PerformerPerformanceType = false;
  PerformerIsPartLeader = false;
  PerformerIsSectionLeader = false;
  PerformerPart = '';
  PerformerPartDetail = '';

  constructor(PerformerID: string, PerformerPerformanceType: boolean, PerformerIsPartLeader: boolean, PerformerIsSectionLeader: boolean,
    PerformerPart: string, PerformerPartDetail: string) {
    this.PerformerID = PerformerID;
    this.PerformerPerformanceType = PerformerPerformanceType;
    this.PerformerIsPartLeader = PerformerIsPartLeader;
    this.PerformerIsSectionLeader = PerformerIsSectionLeader;
    this.PerformerPart = PerformerPart;
    this.PerformerPartDetail = PerformerPartDetail;
  };
};

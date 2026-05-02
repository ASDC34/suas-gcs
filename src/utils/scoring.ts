export interface ScoringInput {
  completedLaps: number;
  hasSuccessfulTakeoffLanding: boolean;
  isFullyAutonomous: boolean;

  operatorCount: number;

  weightLbs: number;
  fitsCheckinVolume: boolean;
  isToolless: boolean;
  batteryUnder100Wh: boolean;

  riskMappingScore: number;

  bay1Survived: boolean;
  bay1WithinTarget: boolean;
  bay1CorrectTarget: boolean;
  bay2Survived: boolean;
  bay2WithinTarget: boolean;
  bay2CorrectTarget: boolean;
}

export interface ScoringResult {
  enduranceScore: number;
  operatorScore: number;
  rapidResponseScore: number;
  riskMappingScore: number;
  deliveryScore: number;

  missionTotal: number;
  docTotal: number;
  grandTotal: number;

  lapPoints: number;
  takeoffLandingPoints: number;
  autonomousPoints: number;
  bay1Score: number;
  bay2Score: number;
}

export function calculateScore(input: ScoringInput): ScoringResult {
  const lapPoints = Math.min(200, 200 * (input.completedLaps / 10) ** 2);
  const takeoffLandingPoints = input.hasSuccessfulTakeoffLanding ? 20 : 0;
  const autonomousPoints = input.isFullyAutonomous ? 30 : 0;
  const enduranceScore = lapPoints + takeoffLandingPoints + autonomousPoints;

  const O = input.operatorCount;
  const operatorScore = Math.round(200 * Math.min(1, (4 - O) / 2));

  const W = input.weightLbs;
  const weightScore = Math.round(50 * Math.min(1, Math.max(0, (35 - W) / 20)));
  const volumeScore = input.fitsCheckinVolume ? 10 : 0;
  const toollessScore = input.fitsCheckinVolume && input.isToolless ? 25 : 0;
  const batteryScore = input.batteryUnder100Wh ? 75 : 0;
  const rapidResponseScore = weightScore + volumeScore + toollessScore + batteryScore;

  const bay1Score =
    (input.bay1Survived ? 20 : 0) +
    (input.bay1WithinTarget ? 50 : 0) +
    (input.bay1CorrectTarget ? 30 : 0);
  const bay2Score =
    (input.bay2Survived ? 20 : 0) +
    (input.bay2WithinTarget ? 50 : 0) +
    (input.bay2CorrectTarget ? 30 : 0);
  const deliveryScore = bay1Score + bay2Score;

  const missionTotal =
    enduranceScore + operatorScore + rapidResponseScore + input.riskMappingScore + deliveryScore;
  const docTotal = 250;

  return {
    enduranceScore: Math.round(enduranceScore),
    operatorScore,
    rapidResponseScore,
    riskMappingScore: input.riskMappingScore,
    deliveryScore,
    missionTotal: Math.round(missionTotal),
    docTotal,
    grandTotal: Math.round(missionTotal + docTotal),
    lapPoints: Math.round(lapPoints),
    takeoffLandingPoints,
    autonomousPoints,
    bay1Score,
    bay2Score,
  };
}

export const VTECH_DEFAULT_SCORING: ScoringInput = {
  completedLaps: 0,
  hasSuccessfulTakeoffLanding: false,
  isFullyAutonomous: false,
  operatorCount: 2,
  weightLbs: 23,
  fitsCheckinVolume: true,
  isToolless: true,
  batteryUnder100Wh: false,
  riskMappingScore: 130,
  bay1Survived: false,
  bay1WithinTarget: false,
  bay1CorrectTarget: false,
  bay2Survived: false,
  bay2WithinTarget: false,
  bay2CorrectTarget: false,
};


/**
 * Club Kit components: the parts clubs are made of, for any venue to use.
 *
 * Geometry components take a `Stage` (see stage.ts) and work in its coordinates: [x, z] on the
 * floor, y up, metres. People helpers return crowd entries for a venue's plan.
 *
 *   DJ equipment    djBooth, djGear, djPieces (players, mixer, turntables, in a layout or placed one by one)
 *   Lighting        movingHeads, mirrorBall, strobe, parCan, ledScreen, swirlScreen, playScreens
 *   Sound           speakerStack, speakerCabinet
 *   People          dancers, talkers, bouncer, doorStaff, dj, queue, group, person, WARDROBE
 *   Structure       railing, trussLeg, trussRun, openStair, openLeaves, barrierLine
 *   Furniture       barCounter, sofa, bottles
 *   Finishes        graffitiWall, makeMats
 *   Outdoors        tree, bollard, lampPost, stool
 *   Shapes          box, along, cyl, tube, panel, quad4, at, placed, rnd
 */
export { makeStages, type Animate, type Beam, type Stage, type Stages } from './stage';
export { makeMats, paintGrille, paintLed, type MatOptions, type Mats } from './mats';
export * from './shapes';
export { DJ_SIZES, djBooth, djGear, djPieces, type BoothLayout, type DeskPiece } from './dj';
export { ledScreen, mirrorBall, mirrorBallGeometry, movingHeads, parCan, playScreens, strobe, swirlScreen } from './lighting';
export { speakerCabinet, speakerStack } from './sound';
export { bouncer, dancers, dj, doorStaff, group, person, queue, talkers, WARDROBE } from './people';
export { barrierLine, openLeaves, openStair, railing, trussLeg, trussRun } from './structure';
export { barCounter, bottles, sofa, type Side } from './furniture';
export { graffitiWall } from './graffiti';
export { bollard, lampPost, stool, tree } from './outdoor';

const os = require('os');

let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

let utility = require('../server/utility.js');

describe('Test Fairy Connector', function () {
    describe('test scap converstion', function () {
        it('should get a simple scap for a one stroke element', function () {
            let simpleElement = {
                "id": "Element_1693384763609_1",
                "creationTime": 1693384763609,
                "x": 251,
                "y": 171,
                "strokes": [{
                    "id": "Stroke_1693384763609_0",
                    "creationTime": 1693384763609, "path": [
                        { "x": 5, "y": 32 },
                        { "x": 6, "y": 31 },
                        { "x": 14, "y": 29 },
                        { "x": 29, "y": 26 },
                        { "x": 112, "y": 17 },
                        { "x": 161, "y": 15 },
                        { "x": 199, "y": 12 },
                        { "x": 216, "y": 8 },
                        { "x": 224, "y": 6 },
                        { "x": 226, "y": 5 }
                    ],
                    "size": 10,
                    "color": "#000000FF"
                }],
                "spine": [{ "x": 5, "y": 5 }, { "x": 226, "y": 32 }],
                "vemX": 10,
                "vemY": 10,
                "parentId": null
            }

            let idMap = new utility.IdMap()
            let scap = utility.elementToScap(simpleElement, idMap);
            expect(scap.split(os.EOL).map(l => l.split("\t"))).to.eql([
                ["#226", "32"],
                ["@10"],
                ["{"],
                ["", "#0", "1"],
                ["", "5", "32", "0"],
                ["", "6", "31", "0"],
                ["", "14", "29", "0"],
                ["", "29", "26", "0"],
                ["", "112", "17", "0"],
                ["", "161", "15", "0"],
                ["", "199", "12", "0"],
                ["", "216", "8", "0"],
                ["", "224", "6", "0"],
                ["", "226", "5", "0"],
                ["}"],
                [""]
            ]);
        });

        it('should get a simple scap for a one multi stroke element', function () {
            let simpleElement = {
                "id": "Element_1693387514674_1",
                "creationTime": 1693387514674,
                "x": 59,
                "y": 98,
                "strokes": [{
                    "id": "Stroke_1693387515637_0",
                    "creationTime": 1693387515637,
                    "path": [
                        { "x": 67, "y": 84 },
                        { "x": 68, "y": 84 },
                        { "x": 70, "y": 84 },
                        { "x": 82, "y": 80 },
                        { "x": 83, "y": 80 }
                    ],
                    "size": 10,
                    "color": "#000000FF"
                }, {
                    "id": "Stroke_1693387515179_0",
                    "creationTime": 1693387515179,
                    "path": [
                        { "x": 20, "y": 46 },
                        { "x": 21, "y": 46 },
                        { "x": 22, "y": 46 },
                        { "x": 33, "y": 40 },
                        { "x": 33, "y": 39 },
                        { "x": 34, "y": 39 }
                    ],
                    "size": 10,
                    "color": "#000000FF"
                }, {
                    "id": "Stroke_1693387514674_0",
                    "creationTime": 1693387514674,
                    "path": [
                        { "x": 5, "y": 10 },
                        { "x": 9, "y": 10 },
                        { "x": 14, "y": 5 },
                        { "x": 15, "y": 5 }
                    ],
                    "size": 10,
                    "color": "#000000FF"
                }
                ],
                "spine": [{
                    "x": 5,
                    "y": 5
                }, {
                    "x": 83,
                    "y": 84
                }
                ],
                "vemX": 10,
                "vemY": 10,
                "parentId": null
            }

            let idMap = new utility.IdMap()
            let scap = utility.elementToScap(simpleElement, idMap);
            expect(scap.split(os.EOL).map(l => l.split("\t"))).to.eql([
                ["#83", "84"],
                ["@10"],
                ["{"],
                ["", "#0", "1"],
                ["", "67", "84", "0"],
                ["", "68", "84", "0"],
                ["", "70", "84", "0"],
                ["", "82", "80", "0"],
                ["", "83", "80", "0"],
                ["}"],
                ["{"],
                ["", "#2", "1"],
                ["", "20", "46", "0"],
                ["", "21", "46", "0"],
                ["", "22", "46", "0"],
                ["", "33", "40", "0"],
                ["", "33", "39", "0"],
                ["", "34", "39", "0"],
                ["}"],
                ["{"],
                ["", "#3", "1"],
                ["", "5", "10", "0"],
                ["", "9", "10", "0"],
                ["", "14", "5", "0"],
                ["", "15", "5", "0"],
                ["}"],
                [""]
            ]);
        });

        it('should convert a simple scap into a path', function () {
            let scap = [
                ["#226", "32"],
                ["@10"],
                ["{"],
                ["", "#16933847636090", "16933847636091"],
                ["", "5", "32", "0"],
                ["", "6", "31", "0"],
                ["", "14", "29", "0"],
                ["", "29", "26", "0"],
                ["", "112", "17", "0"],
                ["", "161", "15", "0"],
                ["", "199", "12", "0"],
                ["", "216", "8", "0"],
                ["", "224", "6", "0"],
                ["", "226", "5", "0"],
                ["}"],
                [""]
            ].map(l => l.join("\t")).join(os.EOL);
            expect(utility.scapToPath(scap)).to.eql([
                { "x": 5, "y": 32 },
                { "x": 6, "y": 31 },
                { "x": 14, "y": 29 },
                { "x": 29, "y": 26 },
                { "x": 112, "y": 17 },
                { "x": 161, "y": 15 },
                { "x": 199, "y": 12 },
                { "x": 216, "y": 8 },
                { "x": 224, "y": 6 },
                { "x": 226, "y": 5 }
            ])
        });
    })
});
import PriorityQueue from "./priority-queue.js";

type PointTuple = [number, number];

interface Polygon extends Array<Array<PointTuple>> {}
interface Point {
  x: number;
  y: number;
};

const getSegDistSq = (p: Point, a: Point, b: Point) => {
  let x = a.x;
  let y = a.y;
  let dx = b.x - x;
  let dy = b.y - y;

  if (dx != 0 || dy != 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = b.x;
      y = b.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;

  return dx * dx + dy * dy;
};

const pointToPolygonDist = (point: Point, polygon: Polygon) => {
  let inside = false;
  let minDistSq = Infinity;

  for (const ring of polygon) {
    for (
      let i = 0, len = ring.length, j = len - 1; i < len; j = i++
    ) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[j];

      if (
        (ay > point.y) != (by > point.y)
        && (point.x < (bx - ax) * (point.y - ay) / (by - ay) + ax))
      {
        inside = !inside;
      }

      minDistSq = Math.min(minDistSq, getSegDistSq(point, { x: ax, y: ay }, { x: bx, y: by }));
    }
  }

  return (inside ? 1 : -1) * Math.sqrt(minDistSq);
};

class Cell {
  c: Point;
  h: number;
  d: number;
  max: number;

  constructor(c: Point, h: number, polygon: Polygon) {
    let err = "";
    if (h == null || Number.isNaN(h)) {
      err += "not h ";
    }
    if (c.x == null || Number.isNaN(c.x)) {
      err += "not c.x ";
    }
    if (c.y == null || Number.isNaN(c.y)) {
      err += "not c.y ";
    }
    if (!polygon.length) {
      err += "not polygon "
    }
    if (err) {
      throw new Error(err);
    }

    this.c = c;
    this.h = h;
    this.d = pointToPolygonDist(c, polygon);
    this.max = Math.max(this.d + h * Math.sqrt(2));
  }
}

const getCentroidCell = (polygon: Polygon, points: Array<PointTuple>) => {
  let area = 1;
  const c: Point = { x: 0, y: 0 };
  const ring = polygon[0];

  for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[j];
    const f = ax * by - bx * ay;
    c.x += (ax + bx) * f;
    c.y += (ay + by) * f;
    area += f * 3;
  }

  if (area === 0) {
    return new Cell({ x: points[0][0], y: points[0][1] }, 0, polygon)
  }

  return new Cell({ x: c.x / area, y: c.y / area}, 0, polygon)
};

const getGeometry = (array: Array<PointTuple>) => {
  return array.reduce((acc, [x, y]) => {
    (x < acc.min.x) && (acc.min.x = x);
    (y < acc.min.y) && (acc.min.y = y);
    (x > acc.max.x) && (acc.max.x = x);
    (y > acc.max.y) && (acc.max.y = y);

    return acc;
  }, {
    min: {
      x: Infinity,
      y: Infinity,
    },
    max: {
      x: 0,
      y: 0,
    }
  })
}

const polylabel = (polygon: Polygon, precision = 1, debug = false) => {
  const envelope = getGeometry(polygon[0]);

  const size = {
    x: envelope.max.x - envelope.min.x,
    y: envelope.max.y - envelope.min.y,
  }

  const cellSize = Math.min(size.x, size.y);
  let h = cellSize / 2;

  const compareMax = (a: Cell, b: Cell) => {
    return a.max < b.max;
  };

  const cellQueue = new PriorityQueue(compareMax);

  if (cellSize === 0) {
    return envelope.min;
  }

  for (let x = envelope.min.x; x < envelope.max.x; x += cellSize) {
    for (let y = envelope.min.y; y < envelope.max.y; y += cellSize) {
      cellQueue.push(new Cell({ x: x + h, y: y + h }, h, polygon));
    }
  }

  let bestCell = getCentroidCell(polygon, points);

  const bboxCell = new Cell({ x: envelope.min.x + size.x / 2, y: envelope.min.y + size.y / 2 }, 0, polygon);
  if (bboxCell.d > bestCell.d) {
    bestCell = bboxCell;
  }

  let numProbes = cellQueue.size();
  while (!cellQueue.empty()) {
    const cell = cellQueue.pop();

    if (cell.d > bestCell.d) {
      bestCell = cell;
      if (debug) {
        console.log("found best", Math.round((1e4 * cell.d) / 1e4));
      }
    }

    if (cell.max - bestCell.d <= precision) {
      continue;
    }

    h = cell.h / 2;

    cellQueue.push(new Cell({ x: cell.c.x + h, y: cell.c.y - h }, h, polygon));
    cellQueue.push(new Cell({ x: cell.c.x - h, y: cell.c.y - h }, h, polygon));
    cellQueue.push(new Cell({ x: cell.c.x - h, y: cell.c.y + h }, h, polygon));
    cellQueue.push(new Cell({ x: cell.c.x + h, y: cell.c.y + h }, h, polygon));
    numProbes += 4;
  }

  if (debug) {
    console.log("num probes:", numProbes);
    console.log("best distance:", bestCell.d);
  }

  return bestCell.c;
};

const points: Array<PointTuple> = [
  [ 261.2  , 150.1  ],
  [ 256.4  , 145.1  ],
  [ 239.3  , 147.4  ],
  [ 229    , 150.2  ],
  [ 226.8  , 154.7  ],
  [ 221.1  , 152.2  ],
  [ 217.4  , 155.3  ],
  [ 211.7  , 155.7  ],
  [ 205.2  , 154.6  ],
  [ 194.5  , 152.2  ],
  [ 184    , 151.2  ],
  [ 173.2  , 150    ],
  [ 169.4  , 153.3  ],
  [ 160.6  , 150    ],
  [ 146.9  , 144    ],
  [ 126.9  , 144.2  ],
  [ 113.9  , 147.1  ],
  [ 103.8  , 148.1  ],
  [ 88.3   , 138.8  ],
  [ 81.8   , 141.5  ],
  [ 84.1   , 145.8  ],
  [ 84.1   , 148.9  ],
  [ 81     , 149.1  ],
  [ 77.6   , 148.8  ],
  [ 76.2   , 142.5  ],
  [ 63.7   , 141.5  ],
  [ 51.2   , 146.6  ],
  [ 27.5   , 139.7  ],
  [ 9.8    , 145.3  ],
  [ 5.7    , 143.2  ],
  [ 3      , 138.3  ],
  [ 9.8    , 134.3  ],
  [ 28.8   , 131.6  ],
  [ 34.6   , 131.7  ],
  [ 45.8   , 131.9  ],
  [ 48.6   , 133.9  ],
  [ 56     , 133    ],
  [ 74.8   , 129.9  ],
  [ 96.2   , 130    ],
  [ 102.6  , 130    ],
  [ 106.1  , 132.4  ],
  [ 109.2  , 129.6  ],
  [ 115    , 130.5  ],
  [ 123    , 125.8  ],
  [ 128.4  , 126.6  ],
  [ 145.2  , 126    ],
  [ 148.7  , 115.9  ],
  [ 155.6  , 121.7  ],
  [ 168.4  , 112.6  ],
  [ 181.6  , 109.6  ],
  [ 195.2  , 111.9  ],
  [ 221.2  , 103.5  ],
  [ 258.7  , 99     ],
  [ 278.4  , 99.3   ],
  [ 295.1  , 101.3  ],
  [ 308.2  , 94.3   ],
  [ 329.1  , 96.6   ],
  [ 344.1  , 92.6   ],
  [ 364.2  , 91.4   ],
  [ 379.3  , 90.4   ],
  [ 395.7  , 89.4   ],
  [ 397.1  , 89.6   ],
  [ 403.1  , 89.6   ],
  [ 414    , 91.9   ],
  [ 420.3  , 96.5   ],
  [ 436.3  , 99     ],
  [ 463.4  , 102    ],
  [ 483.4  , 102.7  ],
  [ 483.3  , 106.8  ],
  [ 489.2  , 107.2  ],
  [ 495.5  , 107.5  ],
  [ 496.8  , 112.1  ],
  [ 500.1  , 109.7  ],
  [ 507    , 110.5  ],
  [ 523.8  , 107.8  ],
  [ 538.1  , 109.6  ],
  [ 540.3  , 106.9  ],
  [ 534.8  , 104.9  ],
  [ 529    , 100    ],
  [ 528.9  , 94.8   ],
  [ 537.8  , 97.9   ],
  [ 554.4  , 96.4   ],
  [ 578    , 98.9   ],
  [ 597.4  , 101.2  ],
  [ 598.8  , 95.7   ],
  [ 606.1  , 98.4   ],
  [ 614.4  , 95.2   ],
  [ 621.9  , 91.7   ],
  [ 622.6  , 89.6   ],
  [ 617.9  , 88.9   ],
  [ 607.1  , 90.3   ],
  [ 595    , 87     ],
  [ 590.3  , 88     ],
  [ 588.3  , 86.1   ],
  [ 589.8  , 83.6   ],
  [ 597.3  , 83.9   ],
  [ 607.6  , 83.3   ],
  [ 602.1  , 82.7   ],
  [ 590.8  , 78.6   ],
  [ 585.7  , 80.3   ],
  [ 578.1  , 76.7   ],
  [ 571.1  , 79     ],
  [ 569.6  , 75.9   ],
  [ 560.3  , 73.4   ],
  [ 550.9  , 70.9   ],
  [ 549.3  , 72.9   ],
  [ 553.6  , 73.9   ],
  [ 560.8  , 80.7   ],
  [ 573.4  , 82.1   ],
  [ 574.1  , 84.5   ],
  [ 571.8  , 84.3   ],
  [ 569.3  , 89.9   ],
  [ 559.1  , 86.6   ],
  [ 553.2  , 78.1   ],
  [ 547.1  , 76.8   ],
  [ 546.6  , 75.1   ],
  [ 540    , 78.7   ],
  [ 539.7  , 69.3   ],
  [ 547.2  , 68.6   ],
  [ 547    , 64.2   ],
  [ 550.1  , 61.8   ],
  [ 542.1  , 61     ],
  [ 531.8  , 60.5   ],
  [ 524.1  , 63.6   ],
  [ 522.5  , 59     ],
  [ 526.8  , 55.9   ],
  [ 532.2  , 50.5   ],
  [ 531.7  , 47.9   ],
  [ 526.5  , 51.7   ],
  [ 517    , 50.1   ],
  [ 511    , 52.6   ],
  [ 501.9  , 55     ],
  [ 497.1  , 56.1   ],
  [ 488.4  , 56     ],
  [ 480.4  , 60.3   ],
  [ 473.6  , 61.3   ],
  [ 469.8  , 57.6   ],
  [ 461.4  , 59.7   ],
  [ 446.3  , 61     ],
  [ 424.9  , 60.3   ],
  [ 414.1  , 61     ],
  [ 404.4  , 63     ],
  [ 400.1  , 60.5   ],
  [ 405    , 52.9   ],
  [ 422    , 48.7   ],
  [ 433.9  , 51.3   ],
  [ 442.3  , 48.3   ],
  [ 455.2  , 40.2   ],
  [ 463.1  , 42.3   ],
  [ 473.2  , 37     ],
  [ 488.4  , 37.1   ],
  [ 484.5  , 41     ],
  [ 488.4  , 49.7   ],
  [ 496    , 50.9   ],
  [ 497.5  , 48.6   ],
  [ 489.6  , 43.8   ],
  [ 497.9  , 41.5   ],
  [ 501.2  , 37.9   ],
  [ 506.7  , 42.2   ],
  [ 515.9  , 33.6   ],
  [ 537.7  , 36.3   ],
  [ 550.7  , 40.9   ],
  [ 552.5  , 45.2   ],
  [ 549.2  , 47.1   ],
  [ 549.2  , 50     ],
  [ 553.7  , 48.7   ],
  [ 560.7  , 47.8   ],
  [ 567.1  , 44.5   ],
  [ 574.2  , 48.7   ],
  [ 577.5  , 47.6   ],
  [ 576.8  , 44.2   ],
  [ 567.2  , 45.1   ],
  [ 554.6  , 40.3   ],
  [ 552.6  , 34.3   ],
  [ 556.6  , 34.5   ],
  [ 560.1  , 29.8   ],
  [ 575.9  , 30     ],
  [ 582.7  , 27.6   ],
  [ 585.9  , 30.2   ],
  [ 587.7  , 29.6   ],
  [ 588.2  , 27.5   ],
  [ 584.6  , 26.5   ],
  [ 577.8  , 26     ],
  [ 580.6  , 18.8   ],
  [ 569.4  , 18.7   ],
  [ 555.8  , 15.8   ],
  [ 549.4  , 11.4   ],
  [ 551.2  , 8      ],
  [ 554.9  , 4.3    ],
  [ 559    , 1.1    ],
  [ 563.6  , 1.7    ],
  [ 570.4  , 4.3    ],
  [ 574.3  , 3.2    ],
  [ 580.6  , 8.3    ],
  [ 583.9  , 0.2    ],
  [ 596.5  , -0.2   ],
  [ 621.8  , 2.6    ],
  [ 639.9  , 4.4    ],
  [ 662.1  , 3.6    ],
  [ 696.7  , 4.3    ],
  [ 717.2  , 10.1   ],
  [ 737.7  , 9.5    ],
  [ 748.9  , 11.3   ],
  [ 781    , 14.8   ],
  [ 814.9  , 14     ],
  [ 830.6  , 17.7   ],
  [ 845.2  , 20.4   ],
  [ 851.5  , 24     ],
  [ 854.7  , 21.6   ],
  [ 867.3  , 22     ],
  [ 887    , 25.4   ],
  [ 890.5  , 26.9   ],
  [ 890.5  , 27.1   ],
  [ 892.6  , 26.9   ],
  [ 895.9  , 32.5   ],
  [ 903.8  , 32.9   ],
  [ 917.3  , 30.8   ],
  [ 933.2  , 34.8   ],
  [ 936.2  , 32     ],
  [ 943.9  , 31.1   ],
  [ 957.7  , 31.7   ],
  [ 956    , 34.9   ],
  [ 950.8  , 40.5   ],
  [ 970.5  , 39.3   ],
  [ 989.5  , 42     ],
  [ 1010.6 , 41.5   ],
  [ 1034.3 , 43.4   ],
  [ 1025.4 , 50.1   ],
  [ 994.9  , 55.4   ],
  [ 995.3  , 57.5   ],
  [ 980.5  , 58.1   ],
  [ 954.6  , 57.3   ],
  [ 954.8  , 63.9   ],
  [ 960.1  , 63     ],
  [ 968.9  , 65.2   ],
  [ 982.4  , 64.4   ],
  [ 985.9  , 62.7   ],
  [ 993.1  , 67.6   ],
  [ 984.7  , 67.9   ],
  [ 969.9  , 69.8   ],
  [ 965.9  , 70     ],
  [ 965    , 72.6   ],
  [ 970.9  , 73.6   ],
  [ 982.2  , 75.3   ],
  [ 982.7  , 79.4   ],
  [ 989.9  , 81.7   ],
  [ 1001.4 , 77.1   ],
  [ 1013   , 79.6   ],
  [ 1022.1 , 73.5   ],
  [ 1024.8 , 78.1   ],
  [ 1032.7 , 78.7   ],
  [ 1040.7 , 79.7   ],
  [ 1030.8 , 83.6   ],
  [ 1014.9 , 90.3   ],
  [ 1010   , 91.2   ],
  [ 999    , 95.3   ],
  [ 987.3  , 95.9   ],
  [ 980.3  , 100.9  ],
  [ 972.6  , 110.9  ],
  [ 958    , 108.6  ],
  [ 929.7  , 113    ],
  [ 908.8  , 109.3  ],
  [ 897.8  , 108.3  ],
  [ 894.3  , 113.8  ],
  [ 907.7  , 116    ],
  [ 931.5  , 116.3  ],
  [ 908.3  , 126.1  ],
  [ 855.6  , 134.2  ],
  [ 879.9  , 136.7  ],
  [ 843.2  , 138.8  ],
  [ 794.6  , 140.3  ],
  [ 758.9  , 139.7  ],
  [ 752    , 144.2  ],
  [ 728.2  , 147.6  ],
  [ 688.5  , 145.5  ],
  [ 661.1  , 146.7  ],
  [ 647.3  , 146.6  ],
  [ 639.4  , 147.5  ],
  [ 619.1  , 152.7  ],
  [ 570.5  , 153.2  ],
  [ 516.7  , 158.1  ],
  [ 501    , 158.1  ],
  [ 499.6  , 159.9  ],
  [ 510.1  , 164.3  ],
  [ 529.2  , 164.7  ],
  [ 529    , 167    ],
  [ 522.7  , 169    ],
  [ 530    , 171.5  ],
  [ 544    , 173.6  ],
  [ 534.9  , 173.5  ],
  [ 520.6  , 176.8  ],
  [ 494.9  , 174.2  ],
  [ 444.9  , 178.5  ],
  [ 418.8  , 180.5  ],
  [ 418.1  , 187.1  ],
  [ 410.8  , 193.6  ],
  [ 393.9  , 198.5  ],
  [ 379.4  , 200.5  ],
  [ 372.8  , 200.8  ],
  [ 349.6  , 201.2  ],
  [ 290.2  , 194.6  ],
  [ 254.1  , 198.8  ],
  [ 246.4  , 196.2  ],
  [ 253.2  , 197.5  ],
  [ 256.1  , 191.1  ],
  [ 261.8  , 187.1  ],
  [ 262.5  , 184.5  ],
  [ 265.8  , 183.3  ],
  [ 274.3  , 178.6  ],
  [ 278.4  , 167.2  ],
  [ 271.2  , 163    ],
  [ 271.4  , 160    ],
  [ 271.9  , 151.6  ],
  [ 265.1  , 149.9  ],
];

console.log(polylabel([points]));

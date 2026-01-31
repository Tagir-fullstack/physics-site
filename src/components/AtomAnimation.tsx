import '../styles/atom.css';

export default function AtomAnimation() {
  return (
    <div className="atom-container">
      <div className="nucleus"></div>

      {/* K shell (2 electrons) */}
      <div className="orbit orbit-1">
        <div className="electron electron-k1"></div>
        <div className="electron electron-k2"></div>
      </div>

      {/* L shell (8 electrons) */}
      <div className="orbit orbit-2">
        <div className="electron electron-l1"></div>
        <div className="electron electron-l2"></div>
        <div className="electron electron-l3"></div>
        <div className="electron electron-l4"></div>
        <div className="electron electron-l5"></div>
        <div className="electron electron-l6"></div>
        <div className="electron electron-l7"></div>
        <div className="electron electron-l8"></div>
      </div>

      {/* M shell (18 electrons - showing 8) */}
      <div className="orbit orbit-3">
        <div className="electron electron-m1"></div>
        <div className="electron electron-m2"></div>
        <div className="electron electron-m3"></div>
        <div className="electron electron-m4"></div>
        <div className="electron electron-m5"></div>
        <div className="electron electron-m6"></div>
        <div className="electron electron-m7"></div>
        <div className="electron electron-m8"></div>
      </div>

      {/* N shell (32 electrons - showing 10) */}
      <div className="orbit orbit-4">
        <div className="electron electron-n1"></div>
        <div className="electron electron-n2"></div>
        <div className="electron electron-n3"></div>
        <div className="electron electron-n4"></div>
        <div className="electron electron-n5"></div>
        <div className="electron electron-n6"></div>
        <div className="electron electron-n7"></div>
        <div className="electron electron-n8"></div>
        <div className="electron electron-n9"></div>
        <div className="electron electron-n10"></div>
      </div>

      {/* O shell (21 electrons - showing 8) */}
      <div className="orbit orbit-5">
        <div className="electron electron-o1"></div>
        <div className="electron electron-o2"></div>
        <div className="electron electron-o3"></div>
        <div className="electron electron-o4"></div>
        <div className="electron electron-o5"></div>
        <div className="electron electron-o6"></div>
        <div className="electron electron-o7"></div>
        <div className="electron electron-o8"></div>
      </div>

      {/* P shell (9 electrons - showing 6) */}
      <div className="orbit orbit-6">
        <div className="electron electron-p1"></div>
        <div className="electron electron-p2"></div>
        <div className="electron electron-p3"></div>
        <div className="electron electron-p4"></div>
        <div className="electron electron-p5"></div>
        <div className="electron electron-p6"></div>
      </div>

      {/* Q shell (2 electrons) */}
      <div className="orbit orbit-7">
        <div className="electron electron-q1"></div>
        <div className="electron electron-q2"></div>
      </div>
    </div>
  );
}

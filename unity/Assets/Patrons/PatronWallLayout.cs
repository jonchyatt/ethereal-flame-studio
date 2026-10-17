using System;
using System.Collections.Generic;

namespace EFS.Patrons
{
    /// <summary>One slot on the rear hemisphere, in degrees. Pure data so it can be checked without the editor.</summary>
    public struct PatronSlot
    {
        public double AzimuthDeg;   // 0 = straight behind the viewer, positive = to the viewer's right when looking at the wall
        public double ElevationDeg; // 0 = horizon
        public int Row;
    }

    /// <summary>Editor-free layout math for the patron wall (no UnityEngine dependency).</summary>
    public static class PatronWallLayout
    {
        public const double DefaultArcDeg = 140.0;      // total horizontal span, centred behind the viewer
        public const double DefaultRowSpacingDeg = 9.0;
        public const double DefaultPerRowMax = 6;

        /// <summary>Fills rows centred on the horizon, alternating above/below, each row spread evenly across the arc.</summary>
        public static List<PatronSlot> Compute(int count, double arcDeg = DefaultArcDeg,
            double rowSpacingDeg = DefaultRowSpacingDeg, int perRow = (int)DefaultPerRowMax)
        {
            if (count < 0) throw new ArgumentOutOfRangeException("count");
            if (perRow < 1) throw new ArgumentOutOfRangeException("perRow");
            var slots = new List<PatronSlot>(count);
            int rows = (count + perRow - 1) / perRow;
            for (int i = 0; i < count; i++)
            {
                int row = i / perRow;
                int inRow = i % perRow;
                int rowCount = Math.Min(perRow, count - row * perRow);
                double az = rowCount == 1 ? 0.0 : -arcDeg / 2.0 + arcDeg * inRow / (rowCount - 1);
                // Row order: centre, +1, -1, +2, -2 ... so the first patrons sit at eye level.
                int step = (row + 1) / 2;
                double el = (row % 2 == 1 ? 1 : -1) * step * rowSpacingDeg;
                if (row == 0) el = 0.0;
                slots.Add(new PatronSlot { AzimuthDeg = az, ElevationDeg = el, Row = row });
            }
            return slots;
        }

        /// <summary>Self-check used by the documented manual test (see docs/PATRON-WALL.md). Returns null when all checks pass.</summary>
        public static string SelfCheck()
        {
            if (Compute(0).Count != 0) return "empty list must yield no slots";
            var one = Compute(1);
            if (one.Count != 1 || one[0].AzimuthDeg != 0.0 || one[0].ElevationDeg != 0.0) return "single patron must sit dead behind at eye level";
            var many = Compute(20);
            if (many.Count != 20) return "slot count must equal patron count";
            foreach (var s in many)
            {
                if (Math.Abs(s.AzimuthDeg) > DefaultArcDeg / 2.0 + 1e-9) return "slot outside the rear arc";
            }
            if (many[0].AzimuthDeg != -DefaultArcDeg / 2.0) return "first row must start at the arc edge";
            return null;
        }
    }
}

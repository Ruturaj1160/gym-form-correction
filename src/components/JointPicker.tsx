import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import { JOINTS, type Joint } from "../engine/types";

// Side-view stick figure in a 120×200 viewBox.
const POS: Record<Joint, [number, number]> = {
  nose: [66, 22],
  ear: [54, 20],
  shoulder: [56, 46],
  elbow: [50, 76],
  wrist: [52, 104],
  index: [54, 116],
  hip: [58, 108],
  knee: [64, 148],
  ankle: [60, 184],
  heel: [54, 190],
  foot_index: [76, 192],
};

const BONES: [Joint, Joint][] = [
  ["ear", "shoulder"],
  ["shoulder", "elbow"],
  ["elbow", "wrist"],
  ["wrist", "index"],
  ["shoulder", "hip"],
  ["hip", "knee"],
  ["knee", "ankle"],
  ["ankle", "heel"],
  ["heel", "foot_index"],
  ["ankle", "foot_index"],
];

export const JOINT_LABEL: Record<Joint, string> = {
  nose: "Nose",
  ear: "Ear",
  shoulder: "Shoulder",
  elbow: "Elbow",
  wrist: "Wrist",
  index: "Index finger",
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle",
  heel: "Heel",
  foot_index: "Toes",
};

export interface JointTriple {
  a: Joint;
  b: Joint;
  c: Joint;
}

interface Props extends JointTriple {
  onChange: (patch: Partial<JointTriple>) => void;
  error?: string;
}

/** Three joint selectors plus a diagram highlighting the measured angle (at B). */
export function JointPicker({ a, b, c, onChange, error }: Props) {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const muted = theme.palette.text.disabled;
  const selected = new Map<Joint, string>([
    [a, "A"],
    [c, "C"],
    [b, "B"],
  ]);

  const field = (key: keyof JointTriple, label: string) => (
    <Autocomplete
      options={JOINTS}
      value={{ a, b, c }[key]}
      onChange={(_, v) => v && onChange({ [key]: v })}
      getOptionLabel={(o) => JOINT_LABEL[o]}
      disableClearable
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ alignItems: "center" }}>
      <Box
        component="svg"
        viewBox="0 0 120 200"
        role="img"
        aria-label={`Angle measured at ${JOINT_LABEL[b]}, between ${JOINT_LABEL[a]} and ${JOINT_LABEL[c]}`}
        sx={{ width: (t) => t.spacing(18), flexShrink: 0 }}
      >
        <circle cx={60} cy={20} r={12} fill="none" stroke={muted} strokeWidth={3} />
        {BONES.map(([p, q]) => (
          <line
            key={`${p}-${q}`}
            x1={POS[p][0]}
            y1={POS[p][1]}
            x2={POS[q][0]}
            y2={POS[q][1]}
            stroke={muted}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
        {[
          [a, b],
          [b, c],
        ].map(([p, q]) => (
          <line
            key={`hl-${p}-${q}`}
            x1={POS[p][0]}
            y1={POS[p][1]}
            x2={POS[q][0]}
            y2={POS[q][1]}
            stroke={accent}
            strokeWidth={5}
            strokeLinecap="round"
          />
        ))}
        {JOINTS.map((j) => {
          const tag = selected.get(j);
          return (
            <g key={j}>
              <circle
                cx={POS[j][0]}
                cy={POS[j][1]}
                r={tag ? (tag === "B" ? 6 : 5) : 3}
                fill={tag ? accent : muted}
              />
              {tag && (
                <text
                  x={POS[j][0] + 9}
                  y={POS[j][1] + 4}
                  fontSize={11}
                  fontWeight={700}
                  fill={accent}
                >
                  {tag}
                </text>
              )}
            </g>
          );
        })}
      </Box>
      <Stack spacing={2} sx={{ flex: 1, width: "100%" }}>
        {field("a", "Joint A")}
        {field("b", "Joint B (angle vertex)")}
        {field("c", "Joint C")}
        {error && (
          <Box sx={{ color: "error.main", typography: "caption" }} role="alert">
            {error}
          </Box>
        )}
      </Stack>
    </Stack>
  );
}

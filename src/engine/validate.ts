import {
  CATEGORIES,
  JOINTS,
  REP_PHASES,
  SIDE_MODES,
  type ExerciseDef,
  type FormRule,
  type JointRef,
  type Metric,
  type RangeCheck,
} from "./types";

class ValidationError extends Error {}

type Obj = Record<string, unknown>;

function fail(path: string, msg: string): never {
  throw new ValidationError(`${path}: ${msg}`);
}

function obj(v: unknown, path: string): Obj {
  if (!v || typeof v !== "object" || Array.isArray(v))
    fail(path, "must be an object");
  return v as Obj;
}

function str(v: unknown, path: string, max: number): string {
  if (typeof v !== "string" || !v.trim() || v.length > max) {
    fail(path, `must be a non-empty string (max ${max} chars)`);
  }
  return v.trim();
}

function num(
  v: unknown,
  path: string,
  min = -Infinity,
  max = Infinity,
): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    fail(path, `must be a number between ${min} and ${max}`);
  }
  return v;
}

function optNum(v: unknown, path: string): number | undefined {
  return v === undefined ? undefined : num(v, path);
}

function oneOf<T extends string>(
  v: unknown,
  options: readonly T[],
  path: string,
): T {
  if (!options.includes(v as T))
    fail(path, `must be one of ${options.join(", ")}`);
  return v as T;
}

function jointRef(v: unknown, path: string): JointRef {
  const base = typeof v === "string" ? v.replace(/^(left|right)_/, "") : v;
  oneOf(base, JOINTS, path);
  return v as JointRef;
}

function pair(v: unknown, path: string): [JointRef, JointRef] {
  if (!Array.isArray(v) || v.length !== 2)
    fail(path, "must be a [joint, joint] pair");
  return [jointRef(v[0], `${path}[0]`), jointRef(v[1], `${path}[1]`)];
}

function metric(v: unknown, path: string): Metric {
  const m = obj(v, path);
  const kind = oneOf(
    m.kind,
    ["angle", "distance", "ratio", "verticalDelta", "incline"],
    `${path}.kind`,
  );
  switch (kind) {
    case "angle": {
      if (!Array.isArray(m.points) || m.points.length !== 3) {
        fail(`${path}.points`, "must be 3 joints");
      }
      const pts = m.points.map((p, i) => jointRef(p, `${path}.points[${i}]`));
      return { kind, points: [pts[0], pts[1], pts[2]] };
    }
    case "distance":
    case "incline":
      return {
        kind,
        a: jointRef(m.a, `${path}.a`),
        b: jointRef(m.b, `${path}.b`),
      };
    case "ratio":
      return {
        kind,
        num: pair(m.num, `${path}.num`),
        den: pair(m.den, `${path}.den`),
      };
    case "verticalDelta":
      return {
        kind,
        a: jointRef(m.a, `${path}.a`),
        b: jointRef(m.b, `${path}.b`),
        ...(m.per === undefined ? {} : { per: pair(m.per, `${path}.per`) }),
      };
  }
}

function rangeCheck(v: unknown, path: string): RangeCheck {
  const r = obj(v, path);
  const min = optNum(r.min, `${path}.min`);
  const max = optNum(r.max, `${path}.max`);
  if (min === undefined && max === undefined)
    fail(path, "needs min and/or max");
  return {
    message: str(r.message, `${path}.message`, 120),
    metric: metric(r.metric, `${path}.metric`),
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  };
}

function formRule(v: unknown, path: string): FormRule {
  const r = obj(v, path);
  if (r.kind === "reachedTarget") {
    return {
      kind: "reachedTarget",
      message: str(r.message, `${path}.message`, 120),
    };
  }
  oneOf(r.kind, ["range"], `${path}.kind`);
  const phases =
    r.phases === undefined
      ? undefined
      : Array.isArray(r.phases)
        ? r.phases.map((p, i) => oneOf(p, REP_PHASES, `${path}.phases[${i}]`))
        : fail(`${path}.phases`, "must be an array");
  return {
    kind: "range",
    ...rangeCheck(r, path),
    ...(phases ? { phases } : {}),
  };
}

/**
 * Validates untrusted JSON into an ExerciseDef, copying only known fields.
 * Returns an error message instead of throwing.
 */
export function validateExercise(
  raw: unknown,
): { ok: true; value: ExerciseDef } | { ok: false; error: string } {
  try {
    const e = obj(raw, "exercise");
    const id = str(e.id, "id", 64);
    if (!/^[a-z0-9-]+$/.test(id))
      fail("id", "use lowercase letters, digits and dashes");

    const base = {
      id,
      name: str(e.name, "name", 60),
      category: oneOf(e.category, CATEGORIES, "category"),
      view: oneOf(e.view, ["side", "front"], "view"),
      setup: str(e.setup, "setup", 300),
      side: oneOf(e.side, SIDE_MODES, "side"),
      ...(e.experimental === true ? { experimental: true } : {}),
    };

    const type = oneOf(e.type, ["reps", "hold"], "type");
    if (type === "hold") {
      if (!Array.isArray(e.conditions) || !e.conditions.length) {
        fail("conditions", "must be a non-empty array");
      }
      return {
        ok: true,
        value: {
          ...base,
          type,
          conditions: e.conditions.map((c, i) =>
            rangeCheck(c, `conditions[${i}]`),
          ),
        },
      };
    }

    const p = obj(e.primary, "primary");
    const start = num(p.start, "primary.start");
    const target = num(p.target, "primary.target");
    if (start === target) fail("primary", "start and target must differ");
    const hysteresis = num(
      p.hysteresis,
      "primary.hysteresis",
      0,
      Math.abs(target - start) / 2,
    );

    const formRules =
      e.formRules === undefined
        ? undefined
        : Array.isArray(e.formRules)
          ? e.formRules.map((r, i) => formRule(r, `formRules[${i}]`))
          : fail("formRules", "must be an array");

    let sideAttribution;
    if (e.sideAttribution !== undefined) {
      const a = obj(e.sideAttribution, "sideAttribution");
      sideAttribution = {
        joint: oneOf(a.joint, JOINTS, "sideAttribution.joint"),
        pick: oneOf(a.pick, ["higher", "lower"], "sideAttribution.pick"),
      };
    }

    return {
      ok: true,
      value: {
        ...base,
        type,
        primary: {
          metric: metric(p.metric, "primary.metric"),
          start,
          target,
          hysteresis,
        },
        minRepDurationMs: num(
          e.minRepDurationMs,
          "minRepDurationMs",
          0,
          10_000,
        ),
        ...(formRules ? { formRules } : {}),
        ...(sideAttribution ? { sideAttribution } : {}),
      },
    };
  } catch (err) {
    if (err instanceof ValidationError)
      return { ok: false, error: err.message };
    throw err;
  }
}

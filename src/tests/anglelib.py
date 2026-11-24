import re, math
def nums(m):
    return [float(x) for x in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', m.split('(',1)[1])]
def cover_angle(m):
    v = nums(m)
    return math.degrees(math.atan2(v[2], v[0])) if len(v) >= 16 else 0.0

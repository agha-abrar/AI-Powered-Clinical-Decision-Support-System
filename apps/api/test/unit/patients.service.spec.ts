import { calculateAge } from "../../src/patients/patients.service";

describe("calculateAge", () => {
  it("calculates age correctly when birthday has passed this year", () => {
    const dob = new Date("1990-01-15");
    const at = new Date("2024-06-01");
    expect(calculateAge(dob, at)).toBe(34);
  });

  it("calculates age correctly when birthday has not yet occurred this year", () => {
    const dob = new Date("1990-12-15");
    const at = new Date("2024-06-01");
    expect(calculateAge(dob, at)).toBe(33);
  });

  it("handles the exact birthday", () => {
    const dob = new Date("1990-06-01");
    const at = new Date("2024-06-01");
    expect(calculateAge(dob, at)).toBe(34);
  });
});

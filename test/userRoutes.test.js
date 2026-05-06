// tests/members.auth.test.js
const request = require("supertest");
const app = require("../app");

describe("Users API", () => {
    let createdId = null;
    const testEmail = `jest_user_@gmail.com`;
    let storedOtp = null;
    let resetToken = null;
    const newPassword = "NewPass@12345";

    // 1) ADD MEMBER
    it("creates a new member", async () => {
        const res = await request(app)
            .post("/api/user/add")
            .send({
                inputData: {
                    user_Name: "Jest Test",
                    user_Email: testEmail,
                    user_Phone: "9876543210",
                    user_Address: "Test Address"
                }
            });

        expect([200, 201]).toContain(res.statusCode);
        expect(res.body.data).toHaveProperty("insertId");
        createdId = res.body.data.insertId;
        expect(createdId).toBeGreaterThan(0);
    });

    // 2) GET MEMBER BY ID
    it("returns the created member by id", async () => {
        const res = await request(app)
            .post("/api/user/get-by-id")
            .send({ inputData: { user_Id: createdId } });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveProperty("user_Id", createdId);
        expect(res.body.data).toHaveProperty("user_Email", testEmail);
    });

    // 3) LIST MEMBERS (filter)
    it("lists members filtered by name", async () => {
        const res = await request(app)
            .post("/api/user/list")
            .send({ inputData: { user_Name: "Jest" } });

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    // 4) UPDATE MEMBER
    it("updates the member", async () => {
        const res = await request(app)
            .post("/api/user/update")
            .send({
                inputData: {
                    user_Id: createdId,
                    user_Name: "Updated Jest Name",
                    user_Phone: "1111111111"
                }
            });

        expect(res.statusCode).toBe(200);
        const msg = res.body.msg || res.body.message || "";
        expect(/updated/i.test(msg)).toBeTruthy();
    });

    // 5) FORGOT PASSWORD -> send OTP
    it("sends OTP for forgot-password (email)", async () => {
        const res = await request(app)
            .post("/api/user/forgot-password")
            .send({ inputData: { login_data: testEmail } });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("success");
    });

    // 6) READ OTP from user record (test-only)
    it("reads stored OTP from user record", async () => {
        const res = await request(app)
            .post("/api/user/get-by-id")
            .send({ inputData: { user_Id: createdId } });

        expect(res.statusCode).toBe(200);
        const user = res.body.data;
        expect(user).toHaveProperty("user_OTP");
        expect(user.user_OTP).toBeTruthy();
        expect(user).toHaveProperty("expired_at");
        expect(new Date(user.expired_at) > new Date()).toBeTruthy();

        storedOtp = String(user.user_OTP);
    });

    // 7) VERIFY OTP -> expect resetToken in response
    it("verifies OTP and returns a resetToken", async () => {
        expect(storedOtp).toBeTruthy();

        const res = await request(app)
            .post("/api/user/verify-otp")
            .send({ inputData: { login_data: testEmail, otp: storedOtp } });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("success");

        const token = res.body.data && res.body.data.resetToken;
        expect(token).toBeTruthy();
        resetToken = token;
    });

    // 8) RESET PASSWORD using resetToken
    it("resets password using resetToken", async () => {
        expect(resetToken).toBeTruthy();

        const res = await request(app)
            .post("/api/user/reset-password-otp")
            .send({
                inputData: {
                    login_data: testEmail,
                    resetToken,
                    new_password: newPassword
                }
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("success");
    });

    // 9) LOGIN with new password
    it("logs in with the new password and returns token + user", async () => {
        const res = await request(app)
            .post("/api/user/login")
            .send({ inputData: { email: testEmail, password: newPassword } });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("success");
        expect(res.body.data).toHaveProperty("accessToken");
        expect(res.body.data).toHaveProperty("user");
        expect(res.body.data.user).toHaveProperty("user_Email", testEmail);
    });

    // 10) DELETE MEMBER
    it("soft deletes the member", async () => {
        const res = await request(app)
            .post("/api/user/delete")
            .send({ inputData: { user_Id: createdId } });

        expect(res.statusCode).toBe(200);
        const msg = res.body.msg || res.body.message || "";
        expect(/deleted/i.test(msg)).toBeTruthy();
    });
});

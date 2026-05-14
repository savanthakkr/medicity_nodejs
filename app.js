const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
require("dotenv").config();

const indexRouter = require("./routes/index");
const apiRouter = require("./routes/api");
const authRouter = require("./routes/auth.routes");
const clientRoutes = require("./routes/client.routes");
const roleRoutes = require("./routes/role.routes");
const userRoutes = require("./routes/user.routes");
const permissionRoutes = require("./routes/permission.routes");
const apiResponse = require("./vars/apiResponse.js");
const cors = require("cors");
const moment = require("moment");


const app = express();

//don't show the log when it is test
if (process.env.NODE_ENV !== "test") {
	app.use(logger("dev"));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

//To allow cross-origin requests
app.use(cors({
	origin: '*'
}));

//Route Prefixes
app.use("/", indexRouter);
app.use("/api/", apiRouter);
app.use("/kl/", apiRouter);
app.use("/auth/", authRouter);
app.use("/client/", clientRoutes);
app.use("/role/", roleRoutes);
app.use("/user/", userRoutes);
app.use("/permission/", permissionRoutes);
// throw 404 if URL not found
app.all("*", function (req, res) {
	return apiResponse.notFoundResponse(res, "Page not found");
});

app.use((err, req, res) => {
	if (err.name == "UnauthorizedError") {
		return apiResponse.unauthorizedResponse(res, err.message);
	}
});

module.exports = app;

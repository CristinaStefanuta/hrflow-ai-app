import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import announcementsRouter from "./announcements";
import requestsRouter from "./requests";
import timeEntriesRouter from "./timeEntries";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(announcementsRouter);
router.use(requestsRouter);
router.use(timeEntriesRouter);
router.use(analyticsRouter);

export default router;

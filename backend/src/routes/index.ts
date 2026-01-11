import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import courseRoutes from './courseRoutes';
import lessonRoutes from './lessonRoutes';
import exerciseRoutes from './exerciseRoutes';
import serialKeyRoutes from './serialKeyRoutes';
import forumRoutes from './forumRoutes';
import statsRoutes from './statsRoutes';
import accessLogRoutes from './accessLogRoutes';
import examRoutes from './examRoutes';
import questionRoutes from './questionRoutes';
import siteConfigRoutes from './siteConfigRoutes';
import courseTopicRoutes from './courseTopicRoutes';
import courseSubtopicRoutes from './courseSubtopicRoutes';
import zoomRoutes from './zoomRoutes';
import announcementRoutes from './announcementRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/lessons', lessonRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/serial-keys', serialKeyRoutes);
router.use('/forum', forumRoutes);
router.use('/stats', statsRoutes);
router.use('/access-logs', accessLogRoutes);
router.use('/exams', examRoutes);
router.use('/questions', questionRoutes);
router.use('/site-config', siteConfigRoutes);
router.use('/course-topics', courseTopicRoutes);
router.use('/course-subtopics', courseSubtopicRoutes);
router.use('/zoom', zoomRoutes);
router.use('/announcements', announcementRoutes);

export default router;


import { relations } from "drizzle-orm/relations";

import { users, sessions, authenticators, orders, transactions, savedViews, projects, roles, rolePermissions, permissions, userRoles, onboardingProfiles, notificationTypes, notifications, userNotificationReads, searchInterests, orderItems, caseStudies, keywordData, serpFeatures, monthlyData, userActivities, feedback, wishlists, wishlistItems, userTags, tags, orderTags, orderFilters, bonusRules, bonusGrants, accounts, projectCompetitors, userInteractions, products, productFeatures, productTags, reviews, reviewTags, reviewProducts, userContext, contextUpdates, userProfiles, userAiInsights, aiInsightUpdates, userContextProfiles, userInteractionEmbeddings, projectFilterPreferences, userPersonality, userTopicClusters, crossChatReferences, chatSessions, semanticCache, ragPerformanceMetrics, userKnowledgeBase, userDocuments, documentChunkMetadata } from "./schema";

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	sessions: many(sessions),
	authenticators: many(authenticators),
	savedViews: many(savedViews),
	userRoles: many(userRoles),
	onboardingProfiles: many(onboardingProfiles),
	userNotificationReads: many(userNotificationReads),
	searchInterests: many(searchInterests),
	orders: many(orders),
	userActivities: many(userActivities),
	feedbacks: many(feedback),
	wishlists: many(wishlists),
	userTags: many(userTags),
	orderFilters: many(orderFilters),
	bonusGrants: many(bonusGrants),
	accounts: many(accounts),
	projects: many(projects),
	userInteractions: many(userInteractions),
	userContexts: many(userContext),
	userProfiles: many(userProfiles),
	userAiInsights: many(userAiInsights),
	userContextProfiles: many(userContextProfiles),
	userInteractionEmbeddings: many(userInteractionEmbeddings),
	projectFilterPreferences: many(projectFilterPreferences),
	userPersonalities: many(userPersonality),
	userTopicClusters: many(userTopicClusters),
	crossChatReferences: many(crossChatReferences),
	chatSessions: many(chatSessions),
	semanticCaches: many(semanticCache),
	ragPerformanceMetrics: many(ragPerformanceMetrics),
	userKnowledgeBases: many(userKnowledgeBase),
	userDocuments: many(userDocuments),
}));

export const authenticatorsRelations = relations(authenticators, ({one}) => ({
	user: one(users, {
		fields: [authenticators.userId],
		references: [users.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	order: one(orders, {
		fields: [transactions.orderId],
		references: [orders.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	transactions: many(transactions),
	orderItems: many(orderItems),
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [orders.projectId],
		references: [projects.id]
	}),
	orderTags: many(orderTags),
}));

export const savedViewsRelations = relations(savedViews, ({one}) => ({
	user: one(users, {
		fields: [savedViews.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [savedViews.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	savedViews: many(savedViews),
	searchInterests: many(searchInterests),
	orders: many(orders),
	userActivities: many(userActivities),
	wishlists: many(wishlists),
	user: one(users, {
		fields: [projects.userId],
		references: [users.id]
	}),
	projectCompetitors: many(projectCompetitors),
	projectFilterPreferences: many(projectFilterPreferences),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	rolePermissions: many(rolePermissions),
	userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
}));

export const onboardingProfilesRelations = relations(onboardingProfiles, ({one}) => ({
	user: one(users, {
		fields: [onboardingProfiles.userId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one, many}) => ({
	notificationType: one(notificationTypes, {
		fields: [notifications.typeId],
		references: [notificationTypes.id]
	}),
	userNotificationReads: many(userNotificationReads),
}));

export const notificationTypesRelations = relations(notificationTypes, ({many}) => ({
	notifications: many(notifications),
}));

export const userNotificationReadsRelations = relations(userNotificationReads, ({one}) => ({
	user: one(users, {
		fields: [userNotificationReads.userId],
		references: [users.id]
	}),
	notification: one(notifications, {
		fields: [userNotificationReads.notificationId],
		references: [notifications.id]
	}),
}));

export const searchInterestsRelations = relations(searchInterests, ({one}) => ({
	user: one(users, {
		fields: [searchInterests.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [searchInterests.projectId],
		references: [projects.id]
	}),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
}));

export const keywordDataRelations = relations(keywordData, ({one}) => ({
	caseStudy: one(caseStudies, {
		fields: [keywordData.caseStudyId],
		references: [caseStudies.id]
	}),
}));

export const caseStudiesRelations = relations(caseStudies, ({many}) => ({
	keywordData: many(keywordData),
	serpFeatures: many(serpFeatures),
	monthlyData: many(monthlyData),
}));

export const serpFeaturesRelations = relations(serpFeatures, ({one}) => ({
	caseStudy: one(caseStudies, {
		fields: [serpFeatures.caseStudyId],
		references: [caseStudies.id]
	}),
}));

export const monthlyDataRelations = relations(monthlyData, ({one}) => ({
	caseStudy: one(caseStudies, {
		fields: [monthlyData.caseStudyId],
		references: [caseStudies.id]
	}),
}));

export const userActivitiesRelations = relations(userActivities, ({one}) => ({
	user: one(users, {
		fields: [userActivities.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [userActivities.projectId],
		references: [projects.id]
	}),
}));

export const feedbackRelations = relations(feedback, ({one}) => ({
	user: one(users, {
		fields: [feedback.userId],
		references: [users.id]
	}),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({one}) => ({
	wishlist: one(wishlists, {
		fields: [wishlistItems.wishlistId],
		references: [wishlists.id]
	}),
}));

export const wishlistsRelations = relations(wishlists, ({one, many}) => ({
	wishlistItems: many(wishlistItems),
	user: one(users, {
		fields: [wishlists.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [wishlists.projectId],
		references: [projects.id]
	}),
}));

export const userTagsRelations = relations(userTags, ({one}) => ({
	user: one(users, {
		fields: [userTags.userId],
		references: [users.id]
	}),
	tag: one(tags, {
		fields: [userTags.tagId],
		references: [tags.id]
	}),
}));

export const tagsRelations = relations(tags, ({many}) => ({
	userTags: many(userTags),
	orderTags: many(orderTags),
	bonusRules: many(bonusRules),
	productTags: many(productTags),
	reviewTags: many(reviewTags),
}));

export const orderTagsRelations = relations(orderTags, ({one}) => ({
	order: one(orders, {
		fields: [orderTags.orderId],
		references: [orders.id]
	}),
	tag: one(tags, {
		fields: [orderTags.tagId],
		references: [tags.id]
	}),
}));

export const orderFiltersRelations = relations(orderFilters, ({one}) => ({
	user: one(users, {
		fields: [orderFilters.userId],
		references: [users.id]
	}),
}));

export const bonusRulesRelations = relations(bonusRules, ({one, many}) => ({
	tag: one(tags, {
		fields: [bonusRules.tagId],
		references: [tags.id]
	}),
	bonusGrants: many(bonusGrants),
}));

export const bonusGrantsRelations = relations(bonusGrants, ({one}) => ({
	bonusRule: one(bonusRules, {
		fields: [bonusGrants.bonusRuleId],
		references: [bonusRules.id]
	}),
	user: one(users, {
		fields: [bonusGrants.userId],
		references: [users.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const projectCompetitorsRelations = relations(projectCompetitors, ({one}) => ({
	project: one(projects, {
		fields: [projectCompetitors.projectId],
		references: [projects.id]
	}),
}));

export const userInteractionsRelations = relations(userInteractions, ({one}) => ({
	user: one(users, {
		fields: [userInteractions.userId],
		references: [users.id]
	}),
}));

export const productFeaturesRelations = relations(productFeatures, ({one}) => ({
	product: one(products, {
		fields: [productFeatures.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	productFeatures: many(productFeatures),
	productTags: many(productTags),
	reviewProducts: many(reviewProducts),
}));

export const productTagsRelations = relations(productTags, ({one}) => ({
	product: one(products, {
		fields: [productTags.productId],
		references: [products.id]
	}),
	tag: one(tags, {
		fields: [productTags.tagId],
		references: [tags.id]
	}),
}));

export const reviewTagsRelations = relations(reviewTags, ({one}) => ({
	review: one(reviews, {
		fields: [reviewTags.reviewId],
		references: [reviews.id]
	}),
	tag: one(tags, {
		fields: [reviewTags.tagId],
		references: [tags.id]
	}),
}));

export const reviewsRelations = relations(reviews, ({many}) => ({
	reviewTags: many(reviewTags),
	reviewProducts: many(reviewProducts),
}));

export const reviewProductsRelations = relations(reviewProducts, ({one}) => ({
	review: one(reviews, {
		fields: [reviewProducts.reviewId],
		references: [reviews.id]
	}),
	product: one(products, {
		fields: [reviewProducts.productId],
		references: [products.id]
	}),
}));

export const contextUpdatesRelations = relations(contextUpdates, ({one}) => ({
	userContext: one(userContext, {
		fields: [contextUpdates.userContextId],
		references: [userContext.id]
	}),
}));

export const userContextRelations = relations(userContext, ({one, many}) => ({
	contextUpdates: many(contextUpdates),
	user: one(users, {
		fields: [userContext.userId],
		references: [users.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(users, {
		fields: [userProfiles.userId],
		references: [users.id]
	}),
}));

export const userAiInsightsRelations = relations(userAiInsights, ({one, many}) => ({
	user: one(users, {
		fields: [userAiInsights.userId],
		references: [users.id]
	}),
	aiInsightUpdates: many(aiInsightUpdates),
}));

export const aiInsightUpdatesRelations = relations(aiInsightUpdates, ({one}) => ({
	userAiInsight: one(userAiInsights, {
		fields: [aiInsightUpdates.userAiInsightsId],
		references: [userAiInsights.id]
	}),
}));

export const userContextProfilesRelations = relations(userContextProfiles, ({one}) => ({
	user: one(users, {
		fields: [userContextProfiles.userId],
		references: [users.id]
	}),
}));

export const userInteractionEmbeddingsRelations = relations(userInteractionEmbeddings, ({one}) => ({
	user: one(users, {
		fields: [userInteractionEmbeddings.userId],
		references: [users.id]
	}),
}));

export const projectFilterPreferencesRelations = relations(projectFilterPreferences, ({one}) => ({
	user: one(users, {
		fields: [projectFilterPreferences.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [projectFilterPreferences.projectId],
		references: [projects.id]
	}),
}));

export const userPersonalityRelations = relations(userPersonality, ({one}) => ({
	user: one(users, {
		fields: [userPersonality.userId],
		references: [users.id]
	}),
}));

export const userTopicClustersRelations = relations(userTopicClusters, ({one}) => ({
	user: one(users, {
		fields: [userTopicClusters.userId],
		references: [users.id]
	}),
}));

export const crossChatReferencesRelations = relations(crossChatReferences, ({one}) => ({
	user: one(users, {
		fields: [crossChatReferences.userId],
		references: [users.id]
	}),
}));

export const chatSessionsRelations = relations(chatSessions, ({one}) => ({
	user: one(users, {
		fields: [chatSessions.userId],
		references: [users.id]
	}),
}));

export const semanticCacheRelations = relations(semanticCache, ({one}) => ({
	user: one(users, {
		fields: [semanticCache.userId],
		references: [users.id]
	}),
}));

export const ragPerformanceMetricsRelations = relations(ragPerformanceMetrics, ({one}) => ({
	user: one(users, {
		fields: [ragPerformanceMetrics.userId],
		references: [users.id]
	}),
}));

export const userKnowledgeBaseRelations = relations(userKnowledgeBase, ({one}) => ({
	user: one(users, {
		fields: [userKnowledgeBase.userId],
		references: [users.id]
	}),
}));

export const userDocumentsRelations = relations(userDocuments, ({one, many}) => ({
	user: one(users, {
		fields: [userDocuments.userId],
		references: [users.id]
	}),
	documentChunkMetadata: many(documentChunkMetadata),
}));

export const documentChunkMetadataRelations = relations(documentChunkMetadata, ({one}) => ({
	userDocument: one(userDocuments, {
		fields: [documentChunkMetadata.documentId],
		references: [userDocuments.id]
	}),
}));
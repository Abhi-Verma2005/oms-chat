import { sql } from "drizzle-orm"
import { pgTable, uniqueIndex, text, timestamp, foreignKey, integer, boolean, jsonb, index, doublePrecision, pgEnum } from "drizzle-orm/pg-core"

export const activityCategory = pgEnum("ActivityCategory", ['AUTHENTICATION', 'NAVIGATION', 'ORDER', 'PAYMENT', 'CART', 'PROFILE', 'ADMIN', 'API', 'ERROR', 'OTHER', 'WISHLIST'])
export const notificationPriority = pgEnum("NotificationPriority", ['LOW', 'NORMAL', 'HIGH', 'URGENT'])
export const orderStatus = pgEnum("OrderStatus", ['PENDING', 'PAID', 'FAILED', 'CANCELLED'])
export const transactionStatus = pgEnum("TransactionStatus", ['INITIATED', 'SUCCESS', 'FAILED'])



export const verificationTokens = pgTable("verification_tokens", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		identifierTokenKey: uniqueIndex("verification_tokens_identifier_token_key").using("btree", table.identifier.asc().nullsLast(), table.token.asc().nullsLast()),
		tokenKey: uniqueIndex("verification_tokens_token_key").using("btree", table.token.asc().nullsLast()),
	}
});

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	sessionToken: text("session_token").notNull(),
	userId: text("user_id").notNull(),
	expires: timestamp({ precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		sessionTokenKey: uniqueIndex("sessions_session_token_key").using("btree", table.sessionToken.asc().nullsLast()),
		sessionsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const authenticators = pgTable("authenticators", {
	id: text().primaryKey().notNull(),
	credentialId: text("credential_id").notNull(),
	userId: text("user_id").notNull(),
	providerAccountId: text("provider_account_id").notNull(),
	credentialPublicKey: text("credential_public_key").notNull(),
	counter: integer().notNull(),
	credentialDeviceType: text("credential_device_type").notNull(),
	credentialBackedUp: boolean("credential_backed_up").notNull(),
	transports: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		credentialIdKey: uniqueIndex("authenticators_credential_id_key").using("btree", table.credentialId.asc().nullsLast()),
		authenticatorsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "authenticators_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	emailVerified: timestamp("email_verified", { precision: 3, mode: 'string' }),
	image: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
	mfaSecret: text("mfa_secret"),
	backupCodes: text("backup_codes").array(),
	password: text(),
	dailyCredits: integer("daily_credits").default(50).notNull(),
	lastCreditReset: timestamp("last_credit_reset", { precision: 3, mode: 'string' }),
},
(table) => {
	return {
		emailKey: uniqueIndex("users_email_key").using("btree", table.email.asc().nullsLast()),
	}
});

export const transactions = pgTable("transactions", {
	id: text().primaryKey().notNull(),
	orderId: text("order_id").notNull(),
	amount: integer().notNull(),
	currency: text().default('USD').notNull(),
	status: transactionStatus().default('INITIATED').notNull(),
	provider: text(),
	reference: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		transactionsOrderIdFkey: foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "transactions_order_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const savedViews = pgTable("saved_views", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	filters: jsonb().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		userIdNameKey: uniqueIndex("saved_views_user_id_name_key").using("btree", table.userId.asc().nullsLast(), table.name.asc().nullsLast()),
		savedViewsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "saved_views_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const rolePermissions = pgTable("role_permissions", {
	id: text().primaryKey().notNull(),
	roleId: text("role_id").notNull(),
	permissionId: text("permission_id").notNull(),
	grantedBy: text("granted_by"),
	grantedAt: timestamp("granted_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		roleIdPermissionIdKey: uniqueIndex("role_permissions_role_id_permission_id_key").using("btree", table.roleId.asc().nullsLast(), table.permissionId.asc().nullsLast()),
		rolePermissionsRoleIdFkey: foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "role_permissions_role_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
		rolePermissionsPermissionIdFkey: foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "role_permissions_permission_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const userRoles = pgTable("user_roles", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	roleId: text("role_id").notNull(),
	assignedBy: text("assigned_by"),
	assignedAt: timestamp("assigned_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
},
(table) => {
	return {
		userIdRoleIdKey: uniqueIndex("user_roles_user_id_role_id_key").using("btree", table.userId.asc().nullsLast(), table.roleId.asc().nullsLast()),
		userRolesUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
		userRolesRoleIdFkey: foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_role_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const onboardingProfiles = pgTable("onboarding_profiles", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	currentStep: integer("current_step").default(1).notNull(),
	situation: text(),
	companyType: text("company_type"),
	marketingOptIn: boolean("marketing_opt_in"),
	companyName: text("company_name"),
	city: text(),
	postalCode: text("postal_code"),
	street: text(),
	country: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	competitorUrl: text("competitor_url"),
	monthlyBudget: text("monthly_budget"),
	promotedUrl: text("promoted_url"),
},
(table) => {
	return {
		userIdKey: uniqueIndex("onboarding_profiles_user_id_key").using("btree", table.userId.asc().nullsLast()),
		onboardingProfilesUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "onboarding_profiles_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const notificationTypes = pgTable("notification_types", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	displayName: text("display_name").notNull(),
	description: text(),
	icon: text(),
	color: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		nameKey: uniqueIndex("notification_types_name_key").using("btree", table.name.asc().nullsLast()),
	}
});

export const notifications = pgTable("notifications", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	body: text().notNull(),
	imageUrl: text("image_url"),
	typeId: text("type_id").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isGlobal: boolean("is_global").default(true).notNull(),
	targetUserIds: text("target_user_ids").array(),
	priority: notificationPriority().default('NORMAL').notNull(),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	createdBy: text("created_by"),
},
(table) => {
	return {
		expiresAtIdx: index("notifications_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast()),
		isActiveIsGlobalCreatedAtIdx: index("notifications_is_active_is_global_created_at_idx").using("btree", table.isActive.asc().nullsLast(), table.isGlobal.asc().nullsLast(), table.createdAt.asc().nullsLast()),
		notificationsTypeIdFkey: foreignKey({
			columns: [table.typeId],
			foreignColumns: [notificationTypes.id],
			name: "notifications_type_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const userNotificationReads = pgTable("user_notification_reads", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	notificationId: text("notification_id").notNull(),
	readAt: timestamp("read_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		userIdNotificationIdKey: uniqueIndex("user_notification_reads_user_id_notification_id_key").using("btree", table.userId.asc().nullsLast(), table.notificationId.asc().nullsLast()),
		userNotificationReadsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_notification_reads_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
		userNotificationReadsNotificationIdFkey: foreignKey({
			columns: [table.notificationId],
			foreignColumns: [notifications.id],
			name: "user_notification_reads_notification_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const changelogEntries = pgTable("changelog_entries", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	body: text().notNull(),
	category: text().notNull(),
	isPublished: boolean("is_published").default(true).notNull(),
	publishedAt: timestamp("published_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	authorId: text("author_id"),
},
(table) => {
	return {
		categoryIdx: index("changelog_entries_category_idx").using("btree", table.category.asc().nullsLast()),
		isPublishedPublishedAtIdx: index("changelog_entries_is_published_published_at_idx").using("btree", table.isPublished.asc().nullsLast(), table.publishedAt.asc().nullsLast()),
	}
});

export const searchInterests = pgTable("search_interests", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	email: text().notNull(),
	query: text().notNull(),
	filters: jsonb(),
	notified: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		emailQueryIdx: index("search_interests_email_query_idx").using("btree", table.email.asc().nullsLast(), table.query.asc().nullsLast()),
		notifiedCreatedAtIdx: index("search_interests_notified_created_at_idx").using("btree", table.notified.asc().nullsLast(), table.createdAt.asc().nullsLast()),
		searchInterestsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "search_interests_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const userActivities = pgTable("user_activities", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	activity: text().notNull(),
	category: activityCategory().notNull(),
	description: text(),
	metadata: jsonb(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		categoryCreatedAtIdx: index("user_activities_category_created_at_idx").using("btree", table.category.asc().nullsLast(), table.createdAt.asc().nullsLast()),
		userIdCreatedAtIdx: index("user_activities_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast(), table.createdAt.asc().nullsLast()),
		userActivitiesUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_activities_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const orderItems = pgTable("order_items", {
	id: text().primaryKey().notNull(),
	orderId: text("order_id").notNull(),
	quantity: integer().default(1).notNull(),
	priceCents: integer("price_cents").notNull(),
	siteId: text("site_id").notNull(),
	siteName: text("site_name").notNull(),
	withContent: boolean("with_content").notNull(),
},
(table) => {
	return {
		orderItemsOrderIdFkey: foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const orders = pgTable("orders", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	status: orderStatus().notNull(),
	totalAmount: integer("total_amount").notNull(),
	currency: text().default('USD').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		ordersUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "orders_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const keywordData = pgTable("keyword_data", {
	id: text().primaryKey().notNull(),
	caseStudyId: text("case_study_id").notNull(),
	keyword: text().notNull(),
	jan2025: integer("jan_2025"),
	feb2025: integer("feb_2025"),
	mar2025: integer("mar_2025"),
	apr2025: integer("apr_2025"),
	may2025: integer("may_2025"),
	jun2025: integer("jun_2025"),
	jul2025: integer("jul_2025"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		keywordDataCaseStudyIdFkey: foreignKey({
			columns: [table.caseStudyId],
			foreignColumns: [caseStudies.id],
			name: "keyword_data_case_study_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const serpFeatures = pgTable("serp_features", {
	id: text().primaryKey().notNull(),
	caseStudyId: text("case_study_id").notNull(),
	featureType: text("feature_type").notNull(),
	keyword: text().notNull(),
	url: text().notNull(),
	position: integer(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		serpFeaturesCaseStudyIdFkey: foreignKey({
			columns: [table.caseStudyId],
			foreignColumns: [caseStudies.id],
			name: "serp_features_case_study_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const caseStudies = pgTable("case_studies", {
	id: text().primaryKey().notNull(),
	clientName: text("client_name").notNull(),
	industry: text().notNull(),
	campaignDuration: text("campaign_duration").notNull(),
	startDate: timestamp("start_date", { precision: 3, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { precision: 3, mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	trafficGrowth: doublePrecision("traffic_growth").notNull(),
	initialTraffic: doublePrecision("initial_traffic").notNull(),
	finalTraffic: doublePrecision("final_traffic").notNull(),
	keywordsRanked: integer("keywords_ranked").notNull(),
	backlinksPerMonth: integer("backlinks_per_month").notNull(),
	domainRatingStart: integer("domain_rating_start"),
	domainRatingEnd: integer("domain_rating_end"),
	objective: text().notNull(),
	challenge: text().notNull(),
	solution: text().notNull(),
	finalOutcomes: text("final_outcomes").notNull(),
	serpFeatures: boolean("serp_features").default(false).notNull(),
	aiOverview: boolean("ai_overview").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	createdBy: text("created_by"),
});

export const monthlyData = pgTable("monthly_data", {
	id: text().primaryKey().notNull(),
	caseStudyId: text("case_study_id").notNull(),
	month: text().notNull(),
	traffic: doublePrecision().notNull(),
	keywords: integer().notNull(),
	backlinks: integer().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		caseStudyIdMonthKey: uniqueIndex("monthly_data_case_study_id_month_key").using("btree", table.caseStudyId.asc().nullsLast(), table.month.asc().nullsLast()),
		monthlyDataCaseStudyIdFkey: foreignKey({
			columns: [table.caseStudyId],
			foreignColumns: [caseStudies.id],
			name: "monthly_data_case_study_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const permissions = pgTable("permissions", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	displayName: text("display_name").notNull(),
	description: text(),
	resource: text().notNull(),
	action: text().notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		nameKey: uniqueIndex("permissions_name_key").using("btree", table.name.asc().nullsLast()),
		resourceActionKey: uniqueIndex("permissions_resource_action_key").using("btree", table.resource.asc().nullsLast(), table.action.asc().nullsLast()),
	}
});

export const roles = pgTable("roles", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	displayName: text("display_name").notNull(),
	description: text(),
	isSystem: boolean("is_system").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		nameKey: uniqueIndex("roles_name_key").using("btree", table.name.asc().nullsLast()),
	}
});

export const feedback = pgTable("feedback", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	rating: integer().notNull(),
	category: text(),
	comment: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	metadata: jsonb(),
},
(table) => {
	return {
		ratingIdx: index("feedback_rating_idx").using("btree", table.rating.asc().nullsLast()),
		userIdCreatedAtIdx: index("feedback_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast(), table.createdAt.asc().nullsLast()),
		feedbackUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "feedback_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const aiChatbotConfig = pgTable("ai_chatbot_config", {
	id: text().primaryKey().notNull(),
	systemPrompt: text("system_prompt").notNull(),
	navigationData: jsonb("navigation_data").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
});

export const aiChatbotNavigation = pgTable("ai_chatbot_navigation", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	route: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		nameRouteKey: uniqueIndex("ai_chatbot_navigation_name_route_key").using("btree", table.name.asc().nullsLast(), table.route.asc().nullsLast()),
	}
});

export const wishlists = pgTable("wishlists", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().default('Default').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		userIdNameKey: uniqueIndex("wishlists_user_id_name_key").using("btree", table.userId.asc().nullsLast(), table.name.asc().nullsLast()),
		wishlistsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "wishlists_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const wishlistItems = pgTable("wishlist_items", {
	id: text().primaryKey().notNull(),
	wishlistId: text("wishlist_id").notNull(),
	siteId: text("site_id").notNull(),
	siteName: text("site_name").notNull(),
	siteUrl: text("site_url"),
	priceCents: integer("price_cents"),
	currency: text().default('USD').notNull(),
	addedAt: timestamp("added_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	notes: text(),
},
(table) => {
	return {
		siteIdAddedAtIdx: index("wishlist_items_site_id_added_at_idx").using("btree", table.siteId.asc().nullsLast(), table.addedAt.asc().nullsLast()),
		wishlistIdSiteIdKey: uniqueIndex("wishlist_items_wishlist_id_site_id_key").using("btree", table.wishlistId.asc().nullsLast(), table.siteId.asc().nullsLast()),
		wishlistItemsWishlistIdFkey: foreignKey({
			columns: [table.wishlistId],
			foreignColumns: [wishlists.id],
			name: "wishlist_items_wishlist_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const tags = pgTable("tags", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	color: text().default('#3B82F6').notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	createdBy: text("created_by"),
},
(table) => {
	return {
		nameKey: uniqueIndex("tags_name_key").using("btree", table.name.asc().nullsLast()),
	}
});

export const userTags = pgTable("user_tags", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	tagId: text("tag_id").notNull(),
	assignedBy: text("assigned_by").notNull(),
	assignedAt: timestamp("assigned_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }),
	notes: text(),
},
(table) => {
	return {
		userIdTagIdKey: uniqueIndex("user_tags_user_id_tag_id_key").using("btree", table.userId.asc().nullsLast(), table.tagId.asc().nullsLast()),
		userTagsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_tags_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
		userTagsTagIdFkey: foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "user_tags_tag_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const orderTags = pgTable("order_tags", {
	id: text().primaryKey().notNull(),
	orderId: text("order_id").notNull(),
	tagId: text("tag_id").notNull(),
	assignedBy: text("assigned_by").notNull(),
	assignedAt: timestamp("assigned_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	notes: text(),
},
(table) => {
	return {
		orderIdTagIdKey: uniqueIndex("order_tags_order_id_tag_id_key").using("btree", table.orderId.asc().nullsLast(), table.tagId.asc().nullsLast()),
		orderTagsOrderIdFkey: foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_tags_order_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
		orderTagsTagIdFkey: foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "order_tags_tag_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const orderFilters = pgTable("order_filters", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	filters: jsonb().notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		userIdNameKey: uniqueIndex("order_filters_user_id_name_key").using("btree", table.userId.asc().nullsLast(), table.name.asc().nullsLast()),
		orderFiltersUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "order_filters_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const bonusRules = pgTable("bonus_rules", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	tagId: text("tag_id"),
	filters: jsonb().notNull(),
	bonusAmount: integer("bonus_amount").notNull(),
	maxUsers: integer("max_users"),
	isActive: boolean("is_active").default(true).notNull(),
	startsAt: timestamp("starts_at", { precision: 3, mode: 'string' }),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	createdBy: text("created_by").notNull(),
},
(table) => {
	return {
		bonusRulesTagIdFkey: foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "bonus_rules_tag_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const bonusGrants = pgTable("bonus_grants", {
	id: text().primaryKey().notNull(),
	bonusRuleId: text("bonus_rule_id").notNull(),
	userId: text("user_id").notNull(),
	amount: integer().notNull(),
	grantedAt: timestamp("granted_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	grantedBy: text("granted_by").notNull(),
	notes: text(),
},
(table) => {
	return {
		bonusRuleIdUserIdKey: uniqueIndex("bonus_grants_bonus_rule_id_user_id_key").using("btree", table.bonusRuleId.asc().nullsLast(), table.userId.asc().nullsLast()),
		bonusGrantsBonusRuleIdFkey: foreignKey({
			columns: [table.bonusRuleId],
			foreignColumns: [bonusRules.id],
			name: "bonus_grants_bonus_rule_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
		bonusGrantsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bonus_grants_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const accounts = pgTable("accounts", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text("provider_account_id").notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		providerProviderAccountIdKey: uniqueIndex("accounts_provider_provider_account_id_key").using("btree", table.provider.asc().nullsLast(), table.providerAccountId.asc().nullsLast()),
		accountsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const projects = pgTable("projects", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	domain: text().notNull(),
	description: text(),
	defaultUrl: text("default_url"),
	defaultAnchor: text("default_anchor"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	avgTraffic: integer("avg_traffic"),
	domainRating: integer("domain_rating"),
},
(table) => {
	return {
		domainKey: uniqueIndex("projects_domain_key").using("btree", table.domain.asc().nullsLast()),
		userIdCreatedAtIdx: index("projects_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast(), table.createdAt.asc().nullsLast()),
		projectsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "projects_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const projectCompetitors = pgTable("project_competitors", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	name: text().notNull(),
	domain: text().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	traffic: integer(),
	domainRating: integer(),
},
(table) => {
	return {
		projectIdDomainKey: uniqueIndex("project_competitors_project_id_domain_key").using("btree", table.projectId.asc().nullsLast(), table.domain.asc().nullsLast()),
		projectCompetitorsProjectIdFkey: foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_competitors_project_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const products = pgTable("products", {
	id: text().primaryKey().notNull(),
	slug: text().notNull(),
	header: text().notNull(),
	subheader: text(),
	imageUrl: text(),
	descriptionMarkdown: text(),
	pricePerMonthCents: integer("price_per_month_cents"),
	discountPercent: integer("discount_percent"),
	finalPricePerMonthCents: integer("final_price_per_month_cents"),
	currency: text().default('USD').notNull(),
	badge: text(),
	showOnShop2: boolean("show_on_shop2").default(false).notNull(),
	showOnLinkBuilding: boolean("show_on_link_building").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		showOnShop2ShowOnLinkBuildingIsActiveSortIdx: index("products_show_on_shop2_show_on_link_building_is_active_sort_idx").using("btree", table.showOnShop2.asc().nullsLast(), table.showOnLinkBuilding.asc().nullsLast(), table.isActive.asc().nullsLast(), table.sortOrder.asc().nullsLast()),
		slugKey: uniqueIndex("products_slug_key").using("btree", table.slug.asc().nullsLast()),
	}
});

export const productFeatures = pgTable("product_features", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	title: text().notNull(),
	value: text(),
	icon: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
},
(table) => {
	return {
		productIdSortOrderIdx: index("product_features_product_id_sort_order_idx").using("btree", table.productId.asc().nullsLast(), table.sortOrder.asc().nullsLast()),
		productFeaturesProductIdFkey: foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_features_product_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const productTags = pgTable("product_tags", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	tagId: text("tag_id").notNull(),
	assignedAt: timestamp("assigned_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		productIdTagIdKey: uniqueIndex("product_tags_product_id_tag_id_key").using("btree", table.productId.asc().nullsLast(), table.tagId.asc().nullsLast()),
		productTagsProductIdFkey: foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_tags_product_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
		productTagsTagIdFkey: foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "product_tags_tag_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const reviews = pgTable("reviews", {
	id: text().primaryKey().notNull(),
	authorName: text("author_name").notNull(),
	rating: integer().notNull(),
	bodyMarkdown: text("body_markdown").notNull(),
	isApproved: boolean("is_approved").default(true).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		isApprovedDisplayOrderIdx: index("reviews_is_approved_display_order_idx").using("btree", table.isApproved.asc().nullsLast(), table.displayOrder.asc().nullsLast()),
	}
});

export const reviewTags = pgTable("review_tags", {
	id: text().primaryKey().notNull(),
	reviewId: text("review_id").notNull(),
	tagId: text("tag_id").notNull(),
	assignedAt: timestamp("assigned_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		reviewIdTagIdKey: uniqueIndex("review_tags_review_id_tag_id_key").using("btree", table.reviewId.asc().nullsLast(), table.tagId.asc().nullsLast()),
		reviewTagsReviewIdFkey: foreignKey({
			columns: [table.reviewId],
			foreignColumns: [reviews.id],
			name: "review_tags_review_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
		reviewTagsTagIdFkey: foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "review_tags_tag_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const reviewProducts = pgTable("review_products", {
	id: text().primaryKey().notNull(),
	reviewId: text("review_id").notNull(),
	productId: text("product_id").notNull(),
	assignedAt: timestamp("assigned_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		reviewIdProductIdKey: uniqueIndex("review_products_review_id_product_id_key").using("btree", table.reviewId.asc().nullsLast(), table.productId.asc().nullsLast()),
		reviewProductsReviewIdFkey: foreignKey({
			columns: [table.reviewId],
			foreignColumns: [reviews.id],
			name: "review_products_review_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
		reviewProductsProductIdFkey: foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "review_products_product_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	}
});
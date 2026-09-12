-- CreateEnum
CREATE TYPE "SocialNetwork" AS ENUM ('instagram', 'tiktok', 'youtube', 'facebook');

-- CreateEnum
CREATE TYPE "HeatmapLevel" AS ENUM ('none', 'l1', 'l2', 'l3');

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "badge" JSONB NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dateLabel" JSONB NOT NULL,
    "title" JSONB NOT NULL,
    "subtitle" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "cta" JSONB NOT NULL,
    "link" TEXT,
    "location" JSONB NOT NULL,
    "emoji" TEXT NOT NULL,
    "accent" TEXT NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_links" (
    "key" "SocialNetwork" NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "followers" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "social_feed_posts" (
    "id" TEXT NOT NULL,
    "net" "SocialNetwork" NOT NULL,
    "img" TEXT NOT NULL,
    "cap" JSONB NOT NULL,
    "likes" TEXT NOT NULL,
    "ago" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "social_feed_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorBranch" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "community_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_stats" (
    "id" TEXT NOT NULL,
    "lbl" JSONB NOT NULL,
    "num" TEXT NOT NULL,
    "sub" JSONB NOT NULL,
    "color" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "performance_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" TEXT NOT NULL,
    "exercise" JSONB NOT NULL,
    "weight" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "delta" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" JSONB NOT NULL,
    "sets" INTEGER NOT NULL,
    "vol" TEXT NOT NULL,
    "pr" JSONB,
    "duration" TEXT NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heatmap_cells" (
    "week" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "level" "HeatmapLevel" NOT NULL DEFAULT 'none',

    CONSTRAINT "heatmap_cells_pkey" PRIMARY KEY ("week","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_likes_postId_userId_key" ON "community_likes"("postId", "userId");

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

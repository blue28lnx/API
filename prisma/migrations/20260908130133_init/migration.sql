-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "hashedRefreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortcuts" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "expectedCombo" TEXT NOT NULL,
    "category" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortcuts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "timeSpentMs" INTEGER NOT NULL,
    "mistakes" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "shortcutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "shortcuts_userId_idx" ON "shortcuts"("userId");

-- CreateIndex
CREATE INDEX "shortcuts_tool_idx" ON "shortcuts"("tool");

-- CreateIndex
CREATE INDEX "shortcuts_userId_tool_idx" ON "shortcuts"("userId", "tool");

-- CreateIndex
CREATE INDEX "practice_sessions_userId_idx" ON "practice_sessions"("userId");

-- CreateIndex
CREATE INDEX "practice_sessions_userId_createdAt_idx" ON "practice_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "practice_sessions_shortcutId_idx" ON "practice_sessions"("shortcutId");

-- AddForeignKey
ALTER TABLE "shortcuts" ADD CONSTRAINT "shortcuts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_shortcutId_fkey" FOREIGN KEY ("shortcutId") REFERENCES "shortcuts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";

const log = apiLogger("GET /api/notifications");

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.userId, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    log.error({ err }, "Failed to fetch notifications");
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

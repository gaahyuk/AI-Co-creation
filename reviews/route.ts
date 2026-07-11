import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define the Review interface
interface Review {
  id: string;
  plcyNo: string;
  author: string;
  rating: number;
  content: string;
  createdAt: string;
}

const REVIEWS_FILE_PATH = path.join(process.cwd(), "src/data/reviews.json");

// Helper function to read reviews from file
function readReviewsFromFile(): Review[] {
  try {
    if (!fs.existsSync(REVIEWS_FILE_PATH)) {
      // Ensure directory exists
      const dir = path.dirname(REVIEWS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(REVIEWS_FILE_PATH, "[]", "utf-8");
      return [];
    }
    const fileContent = fs.readFileSync(REVIEWS_FILE_PATH, "utf-8");
    return JSON.parse(fileContent) as Review[];
  } catch (error) {
    console.error("Error reading reviews file:", error);
    return [];
  }
}

// Helper function to write reviews to file
function writeReviewsToFile(reviews: Review[]): boolean {
  try {
    const dir = path.dirname(REVIEWS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REVIEWS_FILE_PATH, JSON.stringify(reviews, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing reviews file:", error);
    return false;
  }
}

/**
 * GET /api/reviews
 * Query params: plcyNo
 * Returns reviews for the specified policy number.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plcyNo = searchParams.get("plcyNo");

  if (!plcyNo) {
    return NextResponse.json(
      { error: "plcyNo query parameter is required" },
      { status: 400 }
    );
  }

  const allReviews = readReviewsFromFile();
  const policyReviews = allReviews
    .filter((review) => review.plcyNo === plcyNo)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(policyReviews);
}

/**
 * POST /api/reviews
 * Body params: plcyNo, author, rating, content
 * Saves a new review.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plcyNo, author, rating, content } = body;

    // Simple validation
    if (!plcyNo || typeof plcyNo !== "string") {
      return NextResponse.json({ error: "Invalid or missing plcyNo" }, { status: 400 });
    }
    if (!author || typeof author !== "string" || !author.trim()) {
      return NextResponse.json({ error: "Invalid or missing author" }, { status: 400 });
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be a number between 1 and 5" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Invalid or missing content" }, { status: 400 });
    }

    const allReviews = readReviewsFromFile();

    const newReview: Review = {
      id: crypto.randomUUID(),
      plcyNo,
      author: author.trim(),
      rating,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    allReviews.push(newReview);
    const success = writeReviewsToFile(allReviews);

    if (!success) {
      return NextResponse.json({ error: "Failed to write review to storage" }, { status: 500 });
    }

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

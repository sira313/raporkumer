import { handleGet, handlePost, handleDelete } from '$lib/components/piagam-bg.server';

export async function GET(args: { params: Record<string, string>; locals: App.Locals }) {
	return handleGet(args);
}

export async function POST(args: {
	params: Record<string, string>;
	locals: App.Locals;
	request: Request;
}) {
	return handlePost(args);
}

export async function DELETE(args: { params: Record<string, string>; locals: App.Locals }) {
	return handleDelete(args);
}

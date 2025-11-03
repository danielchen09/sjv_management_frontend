import { Loader } from "lucide-react"

export default function Loading() {
    // Or a custom loading skeleton component
    return (
        <div className="flex">
            <Loader className="mr-2 h-6 w-6 animate-spin" />
            <p>Loading...</p>
        </div>
    );
}
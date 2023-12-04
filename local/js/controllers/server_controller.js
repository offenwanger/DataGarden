let ServerController = function () {
    async function getSpine(element) {
        try {
            let result = await fetch('/getspine', {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                body: JSON.stringify(element)
            });
            if (result.ok) {
                return await result.json();
            } else {
                return null;
            }
        } catch (error) {
            console.error("Failed to make the server request: " + error);
            return null;
        }
    }

    async function suggestMerge(elements) {
        try {
            let result = await fetch('/suggestMerge', {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                body: JSON.stringify({ elements })
            });
            if (result.ok) {
                let merge = await result.json();
                return merge;
            } else {
                return null;
            }
        } catch (error) {
            console.error("Failed to make the server request: " + error);
            return null;
        }
    }

    async function suggestStrip(stroke) {
        try {
            let result = await fetch('/suggestStrip', {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                body: JSON.stringify({ stroke })
            });
            if (result.ok) {
                let element = await result.json();
                return element;
            } else {
                return null;
            }
        } catch (error) {
            console.error("Failed to make the server request: " + error);
            return null;
        }
    }

    return {
        getSpine,
        suggestMerge,
        suggestStrip,
    }
}();
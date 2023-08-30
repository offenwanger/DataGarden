let ServerRequestUtil = function () {
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
                // TODO: Return the actual path. 
                return [];
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
    }
}();
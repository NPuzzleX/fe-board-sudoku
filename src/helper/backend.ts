import axios from "axios";

async function axiosMiddleware(method: string, url: string, body: any, option: any): Promise<any> {
  let res: any;
  try {
    if (method == "GET") {
      res = await axios.get(process.env.BASE_URL + url, option);
    } else if (method == "POST") {
      res = await axios.post(process.env.BASE_URL + url, body, option);
    } else if (method == "PUT") {
      res = await axios.put(process.env.BASE_URL + url, body, option);
    } else if (method == "DELETE") {
      res = await axios.delete(process.env.BASE_URL + url, option);
    } else {
      return null;
    }
  } catch (error) {
    if (error.response) {
      if ((error.response.data == "TOKEN EXPIRED") && (error.response.status == 400)) {
        if (!(await validateToken())) {
          console.log("INVALID TOKEN");
          window.postMessage("INVALID TOKEN", window.origin);
          return Promise.reject("INVALID TOKEN");
        } else {
          option.headers.Authorization = "Bearer " + localStorage.getItem("NPToken");
          res = await axiosMiddleware(method, url, body, option);
        }
      } else {
        return Promise.reject(error);
      }
    } else {
      return Promise.reject(error);
    }
  }

  return res;  
}

export async function validateToken(): Promise<boolean> {
  if (!localStorage.getItem("NPToken")) {
    return false;
  }

  let res: any;
  try {
    res = await axios.get(process.env.BASE_URL + "/api/account/login/refresh", {
      headers: {
          "Authorization" : "Bearer " + localStorage.getItem("NPToken")
        }   
    });
  } catch (error) {
    return false;
  }
  
  localStorage.setItem("NPToken", res.data.token);
  return true;
}

export async function postPuzzle(data: any, hidden: boolean): Promise<boolean> {
    let res: any;
    if (!sessionStorage.getItem("PuzzleId")) {
      try {
        res = await axiosMiddleware("POST", "/api/puzzle",
        {
          "type": "Sudoku",
          "data": data,
          "hidden": hidden
        },
        {
          headers: {
            "Authorization" : "Bearer " + localStorage.getItem("NPToken")
          }   
        });
      } catch (error) {
        return false
      }
    } else {
      try {
        res = await axiosMiddleware("PUT", "/api/puzzle",
        {
            "puzzle_id": sessionStorage.getItem("PuzzleId"),
            "type": "Sudoku",
            "data": data,
            "hidden": hidden
        },
        {
            headers: {
                "Authorization" : "Bearer " + localStorage.getItem("NPToken")
            }   
        });
      } catch (error) {
        return false
      }
    }
  
    return true
}

export async function getPuzzle(): Promise<any> {
  let res: any;
  try {
    res = await axiosMiddleware("GET", "/api/puzzle/" + sessionStorage.getItem("PuzzleId"), {},  
    {
      headers: {
          "Authorization" : "Bearer " + localStorage.getItem("NPToken")
      }   
    });
  } catch (error) {
    return null;
  }

  return res.data;
}

export async function loadState(): Promise<any> {
  let res: any;
  try {
    res = await axiosMiddleware("GET", "/api/puzzle/state?puzzle_id=" + sessionStorage.getItem("PuzzleId"), {},
    {
        headers: {
            "Authorization" : "Bearer " + localStorage.getItem("NPToken")
        }   
    });    
  } catch (error) {
    return null;
  }

  return res.data.data;
}

export async function postAnswer(data: any, ptype: string): Promise<any> {
  let res: any;
  try {
      res = await axiosMiddleware("POST", "/api/puzzle/" + sessionStorage.getItem("PuzzleId"), 
      {
          "type": ptype,
          "data": data
      },
      {
          headers: {
              "Authorization" : "Bearer " + localStorage.getItem("NPToken")
          }   
      });
  } catch (error) {
    return {
      resStatus: res.status,
      res: res.data
    };
  }

  return {
    resStatus: res.status,
    res: res.data
  };
}
import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
import json
import re
import math
from pprint import pprint as fprint
import logging
from tqdm import tqdm


# 保证log的文件是utf-8编码，有更优雅的方法，但是懒得折腾了
with open("./log/app.log", encoding="utf-8", mode="w") as f:
    f.write("start\n")
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(message)s",
    filename="./log/app_py.log",
    level=logging.WARN,
    filemode="w",
    datefmt="%a, %d %b %Y %H:%M:%S",
)

# 失败后自动重发机制
s = requests.Session()
s.mount("http://", HTTPAdapter(max_retries=5))
s.mount("https://", HTTPAdapter(max_retries=5))


class App:
    def __init__(self):
        HEADERS_FILE = "./headers.json"
        JOURNALS_FILE = "./journals.json"
        self.RESULT_FILE = "./result/result_py.csv"
        CSV_HEADERS = [
            "link",
            "journal_name",
            "publish_year",
            "title",
            "authors",
            "abstract",
            "institution",
            "foundation",
            "class_code",
        ]

        with open(self.RESULT_FILE, "w", encoding="utf-8") as f:
            f.write(f"{','.join(CSV_HEADERS)}\n")
        with open(JOURNALS_FILE, encoding="utf-8") as f:
            self.ALL_JOURNAL = json.loads(f.read())
        with open(HEADERS_FILE, encoding="utf-8") as f:
            self.HEADERS = json.loads(f.read())

    def get_pages_num(self, journal):
        form = {"searchType": "MulityTermsSearch", "Originate": journal, "Order": "1"}
        url = "http://yuanjian.cnki.com.cn/Search/Result"
        try:
            response = s.post(url, headers=self.HEADERS, data=form, timeout=10)
        except requests.exceptions.RequestException as e:
            print(e)
            logging.warning(f"[get_pages_num] fail {journal}")
            return 0
        bs = BeautifulSoup(response.text, "html.parser")
        records_per_page = 20
        try:
            records_num = int(bs.select_one("#hidTotalCount")["value"])
        except:
            logging.error(f"[get_page_num] fail {journal} cant't get records_num")
            return 0

        pages_num = math.ceil(records_num / records_per_page)
        return pages_num

    def get_link_list(self, journal, page_num):
        form = {
            "searchType": "MulityTermsSearch",
            "ParamIsNullOrEmpty": "true",
            "Islegal": "false",
            "Originate": journal,
            "Order": "1",
            "Page": page_num,
        }
        url = "http://yuanjian.cnki.com.cn/Search/ListResult"
        try:
            response = s.post(url, headers=self.HEADERS, data=form, timeout=10)
        except requests.exceptions.RequestException as e:
            print(e)
            logging.warning(f"[get_link_list] fail {journal} {page_num}")
            return []
        bs = BeautifulSoup(response.text, "html.parser")
        try:
            links = [tag["href"] for tag in bs.select("a.left[target][title]")]
        except:
            logging.error(f"[get_link_list] fail {journal} {page_num} can't get links")
            return []

        return links

    def get_biblio(self, link, journal, page_num):
        try:
            response = s.get(link, timeout=10)
        except requests.exceptions.RequestException as e:
            print(e)
            logging.warning(f"[get_biblio] fail {journal} {page_num} {link}")
            return []

        bs = BeautifulSoup(response.text, "html.parser")

        try:
            journal = bs.select_one(
                "#content > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > a:nth-child(1) > b:nth-child(1)"
            ).string
        except:
            journal = "NULL"

        try:
            publish_year = bs.select_one("font[color]").string
        except:
            publish_year = "NULL"

        try:
            title = bs.select_one(".xx_title").string
        except:
            title = "NULL"

        try:
            tmp = bs.select("#content > div:nth-child(2) > div:nth-child(3) > a")
            authors = ";".join([tag.string.strip() for tag in tmp])
        except:
            authors = "NULL"

        try:
            tmp = bs.select_one("div.xx_font:nth-child(4)").stripped_strings
            abstract = "".join(list(tmp))
        except:
            abstract = "NULL"

        try:
            tmp = bs.select_one("div.xx_font:nth-child(5)").stripped_strings
            others = "".join(tmp)
        except:
            others = ""

        tmp = re.search(r"(【作者单位】.*?)【", others)
        institution = tmp.group(1) if tmp else "NULL"
        tmp = re.search(r"(【基金】.*?)【", others)
        foundation = tmp.group(1) if tmp else "NULL"
        tmp = re.search(r"(【分类号】.*?)$", others)
        class_code = tmp.group(1) if tmp else "NULL"
        result = [
            link,
            journal,
            publish_year,
            title,
            authors,
            abstract,
            institution,
            foundation,
            class_code,
        ]
        result = [item.strip().replace(",", "，") for item in result]
        return result

    def run(self):
        for journal in self.ALL_JOURNAL:
            # if journal != "情报学报":
            #     continue
            print(journal)
            pages_num = self.get_pages_num(journal)
            pbar = tqdm(range(1, pages_num + 1))
            for page_num in pbar:
                # if page_num >= 3:
                #     continue
                link_list = self.get_link_list(journal, page_num)
                for link in link_list:
                    biblio = self.get_biblio(link, journal, page_num)
                    with open(self.RESULT_FILE, "a", encoding="utf-8", newline="") as f:
                        f.write(f"{','.join(biblio)}\n")


if __name__ == "__main__":
    app = App()
    app.run()

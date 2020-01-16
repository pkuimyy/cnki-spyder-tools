import requests
from bs4 import BeautifulSoup
import time
import json
import re
import math
from pprint import pprint as fprint


class App:
    def __init__(self):
        HEADERS_FILE = "./headers.json"
        JOURNALS_FILE = "./journals.json"
        with open(JOURNALS_FILE, encoding="utf-8") as f:
            self.ALL_JOURNAL = json.loads(f.read())
        with open(HEADERS_FILE, encoding="utf-8") as f:
            self.HEADERS = json.loads(f.read())

    def get_pages_num(self, journal):
        form = {"searchType": "MulityTermsSearch", "Originate": journal, "Order": "1"}
        url = "http://yuanjian.cnki.com.cn/Search/Result"
        response = requests.post(url, headers=self.HEADERS, data=form, timeout=5)
        bs = BeautifulSoup(response.text, "html.parser")
        records_per_page = 20
        records_num = int(bs.select_one("#hidTotalCount")["value"])
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
        response = requests.post(url, headers=self.HEADERS, data=form, timeout=5)
        bs = BeautifulSoup(response.text, "html.parser")
        links = [tag["href"] for tag in bs.select("a.left[target][title]")]
        return links

    def get_biblio(self, link):
        response = requests.get(link, timeout=5)
        bs = BeautifulSoup(response.text, "html.parser")
        journal = bs.select_one(
            "#content > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > a:nth-child(1) > b:nth-child(1)"
        ).string
        publish_year = bs.select_one("font[color]").string
        title = bs.select_one(".xx_title").string
        tmp = bs.select("#content > div:nth-child(2) > div:nth-child(3) > a")
        authors = ";".join([tag.string.strip() for tag in tmp])
        tmp = bs.select_one("div.xx_font:nth-child(4)").stripped_strings
        abstract = "".join(list(tmp))
        tmp = bs.select_one("div.xx_font:nth-child(5)").stripped_strings
        others = "".join(tmp)
        tmp = re.search(r"(【作者单位】.*?)【", others)
        institution = tmp.group(1) if tmp else "NULL"
        tmp = re.search(r"(【基金】.*?)【", others)
        foundation = tmp.group(1) if tmp else "NULL"
        tmp = re.search(r"(【分类号】.*?)$", others)
        class_code = tmp.group(1) if tmp else "NULL"
        result = [
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
            if journal != "情报学报":
                continue
            pages_num = self.get_pages_num(journal)
            for page_num in range(1, pages_num + 1):
                if page_num >= 2:
                    continue
                link_list = self.get_link_list(journal, page_num)
                for link in link_list:
                    biblio = self.get_biblio(link)
                    print(biblio)


if __name__ == "__main__":
    app = App()
    app.run()
